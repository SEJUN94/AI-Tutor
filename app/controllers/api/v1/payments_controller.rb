class Api::V1::PaymentsController < ApplicationController
  before_action :set_user

  # POST /api/v1/payments/purchase_membership
  # 유저가 멤버십을 결제하여 획득
  def purchase_membership
    plan_type = params[:plan_type]
    plan = get_plan_details(plan_type)

    unless plan
      return render json: { error: "존재하지 않는 요금제 상품입니다." }, status: :bad_request
    end

    # Mock PG사 API 호출 (무조건 결제가 성공함)
    payment_response = MockPaymentGateway.charge(amount: plan[:price])

    if payment_response.success?
      # 결제 성공 시 멤버십을 생성하거나 업데이트(기한 연장 및 권한 병합)
      @membership = @user.membership || @user.build_membership

      new_permissions = (@membership.permissions || []) | plan[:permissions]
      
      # 기존 활성 멤버십이 있다면 기존 만료일에서 연장, 없거나 만료되었다면 현재 시간부터 시작
      base_date = @membership.active? ? @membership.expiration_date : Time.current
      new_expiration_date = base_date + plan[:duration_days].days

      @membership.assign_attributes(
        permissions: new_permissions,
        expiration_date: new_expiration_date
      )

      if @membership.save
        render json: {
          message: "결제가 성공적으로 완료되었으며 멤버십이 반영되었습니다.",
          transaction_id: payment_response.transaction_id,
          amount_paid: payment_response.amount,
          membership: {
            id: @membership.id,
            user_id: @membership.user_id,
            permissions: @membership.permissions,
            expiration_date: @membership.expiration_date,
            active: @membership.active?
          }
        }, status: :ok
      else
        render json: {
          error: "결제는 성공하였으나 멤버십 반영에 실패했습니다.",
          errors: @membership.errors.full_messages
        }, status: :unprocessable_entity
      end
    else
      render json: {
        error: "결제에 실패하였습니다.",
        error_message: payment_response.error_message
      }, status: :payment_required
    end
  end

  private

  def set_user
    @user = User.find_by(id: params[:user_id])
    unless @user
      render json: { error: "유저를 찾을 수 없습니다." }, status: :not_found
    end
  end

  # 플랜 종류별 상세 설정
  def get_plan_details(plan_type)
    plans = {
      "learning_only" => {
        price: 10000,
        permissions: ["learning"],
        duration_days: 30
      },
      "chatting_only" => {
        price: 15000,
        permissions: ["chatting"],
        duration_days: 30
      },
      "all-in-one" => {
        price: 30000,
        permissions: ["learning", "chatting", "analysis"],
        duration_days: 30
      }
    }
    plans[plan_type]
  end
end

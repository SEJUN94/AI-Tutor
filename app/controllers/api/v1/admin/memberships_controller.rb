class Api::V1::Admin::MembershipsController < ApplicationController
  before_action :set_user

  # GET /api/v1/admin/users/:user_id/membership
  def show
    if @user.membership
      render json: {
        membership: {
          id: @user.membership.id,
          user_id: @user.membership.user_id,
          permissions: @user.membership.permissions,
          expiration_date: @user.membership.expiration_date,
          active: @user.membership.active?
        }
      }, status: :ok
    else
      render json: { membership: nil }, status: :ok
    end
  end

  # POST /api/v1/admin/users/:user_id/membership
  # 특정 멤버십을 강제 부여하거나 수정
  def create
    @membership = @user.membership || @user.build_membership

    @membership.assign_attributes(membership_params)

    if @membership.save
      status_code = @membership.previously_new_record? ? :created : :ok
      render json: {
        message: @membership.previously_new_record? ? "멤버십이 성공적으로 부여되었습니다." : "멤버십이 성공적으로 수정되었습니다.",
        membership: {
          id: @membership.id,
          user_id: @membership.user_id,
          permissions: @membership.permissions,
          expiration_date: @membership.expiration_date,
          active: @membership.active?
        }
      }, status: status_code
    else
      render json: {
        errors: @membership.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  # DELETE /api/v1/admin/users/:user_id/membership
  # 특정 멤버십을 강제 삭제
  def destroy
    if @user.membership
      @user.membership.destroy
      render json: { message: "멤버십이 성공적으로 삭제되었습니다." }, status: :ok
    else
      render json: { error: "해당 유저에게 부여된 멤버십이 없습니다." }, status: :not_found
    end
  end

  private

  def set_user
    @user = User.find_by(id: params[:user_id])
    unless @user
      render json: { error: "유저를 찾을 수 없습니다." }, status: :not_found
    end
  end

  def membership_params
    params.require(:membership).permit(:expiration_date, permissions: [])
  end
end

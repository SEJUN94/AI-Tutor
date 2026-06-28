require 'rails_helper'

RSpec.describe "Api::V1::Payments", type: :request do
  let!(:user) { create(:user) }
  let(:valid_headers) { { "CONTENT_TYPE" => "application/json" } }

  describe "POST /api/v1/payments/purchase_membership" do
    context "정상적인 결제 요청일 때" do
      let(:params) do
        {
          user_id: user.id,
          plan_type: "learning_only"
        }
      end

      it "결제 게이트웨이를 호출하고 멤버십을 성공적으로 신규 발급한다" do
        expect(MockPaymentGateway).to receive(:charge).with(amount: 10000).and_call_original

        expect {
          post "/api/v1/payments/purchase_membership",
               params: params.to_json,
               headers: valid_headers
        }.to change(Membership, :count).by(1)

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["message"]).to eq("결제가 성공적으로 완료되었으며 멤버십이 반영되었습니다.")
        expect(json_response["transaction_id"]).to start_with("tx_")
        expect(json_response["membership"]["permissions"]).to match_array(["learning"])
        
        # 신규 발급 시 현재 시각으로부터 30일 뒤 만료 설정 확인
        expiration = Time.zone.parse(json_response["membership"]["expiration_date"])
        expect(expiration).to be_within(5.seconds).of(30.days.from_now)
      end

      it "기존 활성 멤버십이 있을 때 결제하면 만료일이 30일 누적 연장되고 권한이 병합된다" do
        # 10일 뒤 만료되는 기존 활성 멤버십이 존재하는 상황
        existing_expiry = 10.days.from_now
        create(:membership, user: user, permissions: ["chatting"], expiration_date: existing_expiry)

        post "/api/v1/payments/purchase_membership",
             params: params.to_json,
             headers: valid_headers

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        
        # 권한 병합 확인: 기존 'chatting' + 새 'learning'
        expect(json_response["membership"]["permissions"]).to match_array(["learning", "chatting"])
        
        # 연장 만료일 확인: 기존 만료일(10일 후) + 30일 = 40일 후
        new_expiry = Time.zone.parse(json_response["membership"]["expiration_date"])
        expect(new_expiry).to be_within(5.seconds).of(existing_expiry + 30.days)
      end

      it "기존 멤버십이 만료(Expired) 상태일 때 결제하면 현재 시간 기준으로 30일 연장되고 새 권한이 반영된다" do
        # 5일 전에 이미 만료된 멤버십이 존재하는 상황
        expired_date = 5.days.ago
        create(:membership, user: user, permissions: ["chatting"], expiration_date: expired_date)

        post "/api/v1/payments/purchase_membership",
             params: params.to_json,
             headers: valid_headers

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        
        # 만료되었었으므로 현재 시각 기준으로 30일 뒤에 만료되어야 함 (기존 expired_date 기준이 아님)
        new_expiry = Time.zone.parse(json_response["membership"]["expiration_date"])
        expect(new_expiry).to be_within(5.seconds).of(30.days.from_now)
      end
    end

    context "존재하지 않는 plan_type을 요청했을 때" do
      let(:invalid_params) do
        {
          user_id: user.id,
          plan_type: "premium_gold_plan"
        }
      end

      it "400 Bad Request 에러를 반환한다" do
        post "/api/v1/payments/purchase_membership",
             params: invalid_params.to_json,
             headers: valid_headers

        expect(response).to have_http_status(:bad_request)
        json_response = JSON.parse(response.body)
        expect(json_response["error"]).to eq("존재하지 않는 요금제 상품입니다.")
      end
    end

    context "유저가 존재하지 않을 때" do
      let(:params_no_user) do
        {
          user_id: 99999,
          plan_type: "all-in-one"
        }
      end

      it "404 Not Found 에러를 반환한다" do
        post "/api/v1/payments/purchase_membership",
             params: params_no_user.to_json,
             headers: valid_headers

        expect(response).to have_http_status(:not_found)
        json_response = JSON.parse(response.body)
        expect(json_response["error"]).to eq("유저를 찾을 수 없습니다.")
      end
    end
  end
end

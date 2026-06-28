require 'rails_helper'

RSpec.describe "Api::V1::Admin::Memberships", type: :request do
  let!(:user) { create(:user) }
  let(:valid_headers) { { "CONTENT_TYPE" => "application/json" } }

  describe "POST /api/v1/admin/users/:user_id/membership" do
    context "유저가 존재하고 파라미터가 유효할 때" do
      let(:valid_params) do
        {
          membership: {
            permissions: ["learning", "chatting"],
            expiration_date: 30.days.from_now.iso8601
          }
        }
      end

      it "새로운 멤버십을 성공적으로 부여한다" do
        expect {
          post "/api/v1/admin/users/#{user.id}/membership",
               params: valid_params.to_json,
               headers: valid_headers
        }.to change(Membership, :count).by(1)

        expect(response).to have_http_status(:created)
        json_response = JSON.parse(response.body)
        expect(json_response["message"]).to eq("멤버십이 성공적으로 부여되었습니다.")
        expect(json_response["membership"]["permissions"]).to match_array(["learning", "chatting"])
        expect(json_response["membership"]["active"]).to be true
      end

      it "기존 멤버십이 있으면 내용을 업데이트한다" do
        membership = create(:membership, user: user, permissions: ["learning"], expiration_date: 10.days.from_now)

        expect {
          post "/api/v1/admin/users/#{user.id}/membership",
               params: valid_params.to_json,
               headers: valid_headers
        }.not_to change(Membership, :count)

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["message"]).to eq("멤버십이 성공적으로 수정되었습니다.")
        expect(json_response["membership"]["permissions"]).to match_array(["learning", "chatting"])
      end
    end

    context "파라미터가 유효하지 않을 때 (예: 잘못된 권한)" do
      let(:invalid_params) do
        {
          membership: {
            permissions: ["learning", "invalid_permission_name"],
            expiration_date: 30.days.from_now.iso8601
          }
        }
      end

      it "422 Unprocessable Entity 에러를 반환한다" do
        post "/api/v1/admin/users/#{user.id}/membership",
             params: invalid_params.to_json,
             headers: valid_headers

        expect(response).to have_http_status(:unprocessable_entity)
        json_response = JSON.parse(response.body)
        expect(json_response["errors"]).to be_present
        expect(json_response["errors"].first).to include("contains invalid permissions")
      end
    end

    context "유저가 존재하지 않을 때" do
      it "404 Not Found 에러를 반환한다" do
        post "/api/v1/admin/users/99999/membership",
             params: { membership: { permissions: ["learning"], expiration_date: 10.days.from_now } }.to_json,
             headers: valid_headers

        expect(response).to have_http_status(:not_found)
        json_response = JSON.parse(response.body)
        expect(json_response["error"]).to eq("유저를 찾을 수 없습니다.")
      end
    end
  end

  describe "DELETE /api/v1/admin/users/:user_id/membership" do
    context "멤버십이 존재하는 유저일 때" do
      let!(:membership) { create(:membership, user: user) }

      it "멤버십을 성공적으로 삭제한다" do
        expect {
          delete "/api/v1/admin/users/#{user.id}/membership"
        }.to change(Membership, :count).by(-1)

        expect(response).to have_http_status(:ok)
        json_response = JSON.parse(response.body)
        expect(json_response["message"]).to eq("멤버십이 성공적으로 삭제되었습니다.")
      end
    end

    context "멤버십이 존재하지 않는 유저일 때" do
      it "404 Not Found 에러를 반환한다" do
        delete "/api/v1/admin/users/#{user.id}/membership"

        expect(response).to have_http_status(:not_found)
        json_response = JSON.parse(response.body)
        expect(json_response["error"]).to eq("해당 유저에게 부여된 멤버십이 없습니다.")
      end
    end

    context "유저가 존재하지 않을 때" do
      it "404 Not Found 에러를 반환한다" do
        delete "/api/v1/admin/users/99999/membership"

        expect(response).to have_http_status(:not_found)
        json_response = JSON.parse(response.body)
        expect(json_response["error"]).to eq("유저를 찾을 수 없습니다.")
      end
    end
  end
end

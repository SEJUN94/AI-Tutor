require 'securerandom'

class MockPaymentGateway
  # 결제 결과를 나타내는 Struct
  Response = Struct.new(:success?, :transaction_id, :amount, :error_message)

  # 무조건 결제가 성공하는 Mock Object 호출
  def self.charge(amount:)
    # 실제 PG API 연동 대신 무조건 성공 응답을 반환합니다.
    Response.new(
      true, 
      "tx_#{SecureRandom.hex(10)}", 
      amount, 
      nil
    )
  end
end

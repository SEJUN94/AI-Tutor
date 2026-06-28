# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
User.find_or_create_by!(id: 1) do |user|
  user.name = "홍길동"
  user.email = "gildong@example.com"
end
puts "Seed 데이터 생성 완료: 유저 ID 1 (홍길동)"

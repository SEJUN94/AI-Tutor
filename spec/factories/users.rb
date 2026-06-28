FactoryBot.define do
  factory :user do
    name { "홍길동" }
    sequence(:email) { |n| "user#{n}@example.com" }
  end
end

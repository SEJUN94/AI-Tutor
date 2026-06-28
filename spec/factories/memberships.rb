FactoryBot.define do
  factory :membership do
    association :user
    permissions { ["learning"] }
    expiration_date { 30.days.from_now }
  end
end

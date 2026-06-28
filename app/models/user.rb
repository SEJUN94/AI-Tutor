class User < ApplicationRecord
  has_one :membership, dependent: :destroy

  validates :name, presence: true
  validates :email, presence: true, uniqueness: true
end

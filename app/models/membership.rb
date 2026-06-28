class Membership < ApplicationRecord
  belongs_to :user

  VALID_PERMISSIONS = %w[learning chatting analysis].freeze

  serialize :permissions, type: Array, coder: JSON

  validates :user_id, presence: true, uniqueness: true
  validates :expiration_date, presence: true
  validate :validate_permissions

  def active?
    expiration_date.present? && expiration_date >= Time.current
  end

  def has_permission?(permission)
    active? && permissions.include?(permission.to_s)
  end

  private

  def validate_permissions
    unless permissions.is_a?(Array)
      errors.add(:permissions, "must be an array")
      return
    end

    invalid_permissions = permissions - VALID_PERMISSIONS
    if invalid_permissions.any?
      errors.add(:permissions, "contains invalid permissions: #{invalid_permissions.join(', ')}. Allowed values: #{VALID_PERMISSIONS.join(', ')}")
    end
  end
end

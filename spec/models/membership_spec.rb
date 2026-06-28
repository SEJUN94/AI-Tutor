require 'rails_helper'

RSpec.describe Membership, type: :model do
  let(:user) { create(:user) }

  describe 'Validations' do
    it 'is valid with valid attributes' do
      membership = build(:membership, user: user)
      expect(membership).to be_valid
    end

    it 'is invalid without a user' do
      membership = build(:membership, user: nil)
      expect(membership).not_to be_valid
      expect(membership.errors[:user]).to include('must exist')
    end

    it 'is invalid without an expiration_date' do
      membership = build(:membership, user: user, expiration_date: nil)
      expect(membership).not_to be_valid
      expect(membership.errors[:expiration_date]).to include("can't be blank")
    end

    it 'enforces unique membership per user' do
      create(:membership, user: user)
      duplicate_membership = build(:membership, user: user)
      expect(duplicate_membership).not_to be_valid
      expect(duplicate_membership.errors[:user_id]).to include('has already been taken')
    end

    describe 'permissions validation' do
      it 'is invalid if permissions is not an array' do
        expect {
          build(:membership, user: user, permissions: "learning")
        }.to raise_error(ActiveRecord::SerializationTypeMismatch)
      end

      it 'is valid with any combination of learning, chatting, and analysis' do
        valid_combos = [
          [],
          ['learning'],
          ['chatting', 'analysis'],
          ['learning', 'chatting', 'analysis']
        ]
        valid_combos.each do |permissions|
          membership = build(:membership, user: user, permissions: permissions)
          expect(membership).to be_valid
        end
      end

      it 'is invalid if it contains other values' do
        membership = build(:membership, user: user, permissions: ['learning', 'invalid_perm'])
        expect(membership).not_to be_valid
        expect(membership.errors[:permissions].first).to include('contains invalid permissions')
      end
    end
  end

  describe '#active?' do
    it 'returns true if expiration_date is in the future' do
      membership = build(:membership, user: user, expiration_date: 1.day.from_now)
      expect(membership.active?).to be true
    end

    it 'returns false if expiration_date is in the past' do
      membership = build(:membership, user: user, expiration_date: 1.day.ago)
      expect(membership.active?).to be false
    end

    it 'returns false if expiration_date is nil' do
      membership = build(:membership, user: user, expiration_date: nil)
      # validations will catch nil expiration_date, but the method itself should handle it safely
      expect(membership.active?).to be false
    end
  end

  describe '#has_permission?' do
    let(:membership) { create(:membership, user: user, permissions: ['learning', 'chatting'], expiration_date: 1.day.from_now) }

    it 'returns true if membership is active and has the permission' do
      expect(membership.has_permission?('learning')).to be true
      expect(membership.has_permission?('chatting')).to be true
    end

    it 'returns false if membership is active but does not have the permission' do
      expect(membership.has_permission?('analysis')).to be false
    end

    it 'returns false if membership has the permission but is expired' do
      membership.update!(expiration_date: 1.day.ago)
      expect(membership.has_permission?('learning')).to be false
    end
  end
end

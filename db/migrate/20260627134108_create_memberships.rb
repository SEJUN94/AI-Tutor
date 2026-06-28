class CreateMemberships < ActiveRecord::Migration[8.0]
  def change
    create_table :memberships do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.text :permissions
      t.datetime :expiration_date

      t.timestamps
    end
  end
end

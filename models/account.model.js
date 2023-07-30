import mongoose from 'mongoose'
const { Schema } = mongoose

const accountSchema = new Schema(
  {
    name: {
      type: String,
    },
    number: {
      type: Number,
    },
    bank: {
      type: String,
    },
    branch: {
      type: String,
    },
    file: {
      type: JSON,
    },
    reconciled: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('Account', accountSchema)

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
      type: Buffer,
    },
    reconciled: {
      type: Boolean,
    },
  },
  {
    timestamps: true,
  }
)

export default mongoose.model('Account', accountSchema)

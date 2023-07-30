import Account from '../models/account.model.js'
import asyncHandler from 'express-async-handler'
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'
import csvtojson from 'csvtojson'
import { FileDownload, handleFileDownload } from '../config/fileProcessor.js'
import cloudinary from 'cloudinary'

export const createAccount = asyncHandler(async (req, res) => {
  try {
    const { name, number, bank, branch } = req.body

    const file = req.file
    const filePath = req.file.path
    console.log('<<<<<<<<FILE>>>>>>>>', file)

    const fileUrl = await new Promise((resolve, reject) => {
      // Upload the file to Cloudinary
      const cloudinaryFolder = 'reconx'
      cloudinary.uploader.upload(
        filePath,
        { resource_type: 'raw', folder: cloudinaryFolder },
        (error, result) => {
          if (error) {
            console.error('Error uploading to Cloudinary:', error)
            return reject(error)
          }

          // Remove the temporary file from the server
          fs.unlinkSync(filePath)

          // The file URL in Cloudinary will be available in result.secure_url
          const fileUrl = result.secure_url
          console.log('File uploaded to Cloudinary:', fileUrl)
          resolve(fileUrl)
        }
      )
    })

    console.log('<<<<<<<<JSON DATA>>>>>>>>', fileUrl)

    const newBankAccount = {
      name,
      number,
      bank,
      branch,
      fileUrl,
    }

    const account = await Account.create(newBankAccount)
    res.status(200).send(account)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ error: error.message })
  }
})

export const getAccounts = asyncHandler(async (req, res) => {
  try {
    const accounts = await Account.find().select('-file -reconciled')
    res.status(200).json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    res.status(500).json({ error: 'Error fetching accounts' })
  }
})

// export const singleAccount = asyncHandler(async (req, res) => {
//   try {
//     const { accountId } = req.query
//     console.log('>>>>QUERY<<<<<<', req.query)
//     const account = await Account.findById({ _id: accountId })
//     if (!account) {
//       res.status(404).json({ error: 'Account not found' })
//       return
//     }
//     const { _id, name, number, bank, branch, reconciled, file } = account
//     // Parse the buffer data from MongoDB into an array
//     const arrayData = JSON.parse(file.data.toString())
//     // const arrayData = handleFileUpload(file)
//     const pageNumber = parseInt(req.query.pageNumber) || 1
//     const pageSize = parseInt(req.query.pageSize) || 10
//     const startIndex = (pageNumber - 1) * pageSize
//     const endIndex = startIndex + pageSize
//     const arrayChunk = arrayData.slice(startIndex, endIndex)
//     const accountData = {
//       _id,
//       name,
//       number,
//       bank,
//       branch,
//       reconciled,
//       file: arrayChunk,
//       totalTransactions: file.length,
//       totalPages: Math.ceil(arrayData.length / pageSize),
//     }
//     console.log('>>>>ACCOUNTDATA<<<<<<', accountData)
//     res.status(200).json(accountData)
//   } catch (error) {
//     console.error('Error fetching account:', error)
//     res.status(500).json({ error: 'Error fetching account' })
//   }
// })

export const singleAccount = asyncHandler(async (req, res) => {
  try {
    const accountId = req.params.id
    const account = await Account.findById({ _id: accountId }).select(
      '-reconciled'
    )

    // Check if the account exists and has a file associated with it
    if (!account || !account.fileUrl) {
      res.status(404)
      return new Error('error: Account not found or file URL not provided')
    }
    const { _id, name, number, bank, branch, fileUrl } = account

    const fileData = await FileDownload(fileUrl)

    console.log('<<<<JSON Data>>>>>>>', fileData)
    // const jsonData = await handleFileDownload(fileData)

    // const dataProcessor = Transform({
    //   objectMode: true,
    //   transform(chunk, enc, callback) {
    //     const jsonData = chunk.toString()
    //     const data = JSON.parse(jsonData)

    //     return callback(null, JSON.stringify(data))
    //   },
    // })

    // const processData = await pipeline(
    //   createReadStream(filePath),
    //   csvtojson(),
    //   dataProcessor,
    //   async function* (source) {
    //     for await (const data of source) {
    //       return data
    //     }
    //   }
    // )

    // console.log('<<<<JSON Data>>>>>>>', jsonData)
    // const accountData = {
    //   _id,
    //   name,
    //   number,
    //   bank,
    //   branch,
    //   reconciled,
    //   fileData,
    //   // file: arrayData,
    //   // totalPages: Math.ceil(arrayData.length / pageSize),
    // }
    // console.log(`=====ACCOUNT WITH ${arrayData} FETCHED SUCCESSFULLY=====`)
    res.status(200).json({ message: 'DONE' })
  } catch (error) {
    console.log(error)
  }
})

export const deleteAccount = asyncHandler(async (req, res) => {
  const { accountIds } = req.body
  console.log('============Delete accountIds===========', accountIds)

  try {
    // Delete multiple accounts with the provided account IDs from the MongoDB database
    await Account.deleteMany({ _id: { $in: accountIds } })

    res.status(200).send('Deleted Successfully!')
  } catch (error) {
    console.error('Error deleting accounts:', error)
    res.sendStatus(500)
  }
})

export const getAccountToReconcile = asyncHandler(async (req, res) => {
  const { accountIds } = req.query
  console.log('============Reconcile accountIds===========', req.query)

  try {
    const accounts = await Account.find({ _id: { $in: accountIds } }).select(
      'file'
    )

    if (!accounts) {
      res.status(404)
      return new Error('Account(s) not found')
    }

    const selectedAccountsFiles = accounts.map((selectedAccountFile) => {
      const selectedAccountData = selectedAccountFile.file
      const jsonString = selectedAccountData.toString()
      const arrayData = JSON.parse(jsonString)
      return arrayData
    })

    console.log(`=====ACCOUNT WITH ${accountIds} FETCHED SUCCESSFULLY=====`)
    res.status(200).json(selectedAccountsFiles)
  } catch (error) {
    console.log('>>>>>>>error<<<<<<<', error)
    res.status(500)
    throw new Error('Error fetching Account to Reconcile: ', error)
  }
})

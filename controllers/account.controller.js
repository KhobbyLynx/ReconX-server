import Account from '../models/account.model.js'
import asyncHandler from 'express-async-handler'
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'
import util from 'util'
import { v2 as cloudinary } from 'cloudinary'
import csvtojson from 'csvtojson'
import axios from 'axios'
import { handleFileUpload } from '../config/fileProcessor.js'

export const createAccount = asyncHandler(async (req, res) => {
  try {
    const { name, number, bank, branch } = req.body

    const file = req.file
    console.log('<<<<<<<<FILE>>>>>>>>', file)

    const jsonData = await handleFileUpload(file)

    console.log('<<<<<<<<JSON DATA>>>>>>>>', jsonData)

    const newBankAccount = {
      name,
      number,
      bank,
      branch,
      file: jsonData,
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

    if (!account) {
      res.status(404)
      return new Error('Account not found')
    }
    const { _id, name, number, bank, branch, file } = account

    const filePath = file.path

    const dataProcessor = Transform({
      objectMode: true,
      transform(chunk, enc, callback) {
        const jsonData = chunk.toString()
        const data = JSON.parse(jsonData)

        return callback(null, JSON.stringify(data))
      },
    })

    const processData = await pipeline(
      createReadStream(filePath),
      csvtojson(),
      dataProcessor,
      async function* (source) {
        for await (const data of source) {
          return data
        }
      }
    )

    console.log('<<<<Processed Data>>>>>>>', processData)
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

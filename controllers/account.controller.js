import Account from '../models/account.model.js'
import asyncHandler from 'express-async-handler'
import {
  concatenateObjects,
  convertArrayToBuffer,
  convertBufferToArray,
  parseFile,
} from '../config/fileProcessorFunctions.js'

export const createAccount = asyncHandler(async (req, res, next) => {
  try {
    const { name, number, bank, branch } = req.body

    const file = req.file
    console.log('<<<<<<<<FILE>>>>>>>>', file)
    // Parse the file asynchronously using await
    const fileData = await parseFile(file)

    // Create an array of objects with only the necessary fields for each transaction
    // const transactions = fileData.map((transaction) => ({
    //   'POST DATE': transaction[0],
    //   PARTICULARS: transaction['PARTICULARS'],
    //   REFERENCE: transaction['REFERENCE'],
    //   'VALUE DATE': transaction['VALUE DATE'],
    //   'DEBIT AMOUNT': transaction['DEBIT AMOUNT'],
    //   'CREDIT AMOUNT': transaction['CREDIT AMOUNT'],
    //   BALANCE: transaction['BALANCE'],
    // }))
    // const concatenatedTransactions = concatenateObjects(fileData)

    // const bufferData = convertArrayToBuffer(fileData)

    console.log('========')
    // console.log(transactions)
    console.log('========')

    const newBankAccount = {
      name,
      number,
      bank,
      branch,
      reconciled: false,
      file: fileData,
    }

    //Save the new account to the database
    const account = await Account.create(newBankAccount)
    console.log(newBankAccount, '=====ACCOUNT CREATED FETCHED SUCCESSFULLY')
    res.status(200).send(account)
  } catch (error) {
    console.log(error)
    return new Error(error.message)
  }
})

export const getAccounts = asyncHandler(async (req, res) => {
  try {
    const accounts = await Account.find().select('-file')
    res.status(200).json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    res.status(500).json({ error: 'Error fetching accounts' })
  }
})

export const singleAccount = asyncHandler(async (req, res) => {
  try {
    const { accountId } = req.query
    console.log('>>>>QUERY<<<<<<', req.query)
    const account = await Account.findById({ _id: accountId })

    if (!account) {
      res.status(404).json({ error: 'Account not found' })
      return
    }

    const { _id, name, number, bank, branch, reconciled, file } = account

    // Parse the buffer data from MongoDB into an array
    const arrayData = JSON.parse(file.toString())

    const pageNumber = parseInt(req.query.pageNumber) || 1
    const pageSize = parseInt(req.query.pageSize) || 10

    const startIndex = (pageNumber - 1) * pageSize
    const endIndex = startIndex + pageSize
    const arrayChunk = arrayData.slice(startIndex, endIndex)

    const accountData = {
      _id,
      name,
      number,
      bank,
      branch,
      reconciled,
      file: arrayChunk,
      totalPages: Math.ceil(arrayData.length / pageSize),
    }

    console.log('>>>>ACCOUNTDATA<<<<<<', accountData)
    res.status(200).json(accountData)
  } catch (error) {
    console.error('Error fetching account:', error)
    res.status(500).json({ error: 'Error fetching account' })
  }
})

// export const singleAccount = asyncHandler(async (req, res) => {
//   try {
//     const accountId = req.params.id
//     const account = await Account.findById({ _id: accountId })

//     if (!account) {
//       res.status(404)
//       return new Error('Account not found')
//     }

//     const { _id, name, number, bank, branch, reconciled, file } = account

//     const bufferData = file
//     const arrayData = convertBufferToArray(bufferData)
//     console.log(
//       `=====OKKKKK WITH ${(file, '=====', arrayData)} OK SUCCESSFULLY=====`
//     )
//     Array.from({ length: 100 }, (_, index) => `Item ${index + 1}`)
//     const pageNumber = parseInt(req.query.pageNumber) || 1
//     const pageSize = parseInt(req.query.pageSize) || 10

//     const startIndex = (pageNumber - 1) * pageSize
//     const endIndex = startIndex + pageSize
//     const arrayChunk = arrayData?.slice(startIndex, endIndex)

//     const accountData = {
//       _id,
//       name,
//       number,
//       bank,
//       branch,
//       reconciled,
//       file: arrayChunk,
//       totalPages: Math.ceil(arrayData.length / pageSize),
//     }
//     console.log(`=====ACCOUNT WITH ${accountData} FETCHED SUCCESSFULLY=====`)
//     res.status(200).json(accountData)
//   } catch (error) {
//     console.log(error)
//   }
// })

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

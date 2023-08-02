import Account from '../models/account.model.js'
import asyncHandler from 'express-async-handler'
import { FileDownload, handleFileDownload } from '../config/fileProcessor.js'
import fs from 'fs'
import { v2 as cloudinary } from 'cloudinary'
import memoryCache from 'memory-cache'
import mongoose from 'mongoose'

export const createAccount = asyncHandler(async (req, res) => {
  try {
    const { name, number, bank, branch } = req.body

    const filePath = req.file.path

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
    const accounts = await Account.find().select('-fileUrl')
    res.status(200).json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    res.status(500).json({ error: 'Error fetching accounts' })
  }
})

export const singleAccount = asyncHandler(async (req, res) => {
  try {
    const accountId = req.params.id
    const page = parseInt(req.query.page) || 1 // Get the requested page from the query parameters
    const pageSize = 20 // Number of items per page

    // Check if the paginated data is already in the cache
    const cacheKey = `accountData_${accountId}_${page}`
    const cachedData = memoryCache.get(cacheKey)

    if (cachedData) {
      console.log('=====ACCOUNT DATA FETCHED FROM CACHE=====', cachedData)
      return res.status(200).send(cachedData) // Return the cached data and stop further execution
    }

    // If not in cache, fetch the data from the database
    const account = await Account.findById({ _id: accountId }).select(
      '-reconciled'
    )

    // Check if the account exists and has a file associated with it
    if (!account || !account.fileUrl) {
      res.status(404)
      throw new Error('Account not found or file URL not provided')
    }

    const { _id, name, number, bank, branch, fileUrl } = account

    console.log('<<<<FileUrl>>>>>>>', fileUrl)

    const fileBuffer = await FileDownload(fileUrl)

    const processedData = await handleFileDownload(fileBuffer, fileUrl)
    const { jsonData, totalCreditAmount, totalDebitAmount, dateRange } =
      processedData
    console.log('<<<<File Data>>>>>>>', jsonData)

    // Calculate the start and end index of the current page's data
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize

    // Slice the jsonData to get the paginated chunk
    const paginatedData = jsonData.slice(startIndex, endIndex)

    const arrayData = {
      _id,
      name,
      number,
      bank,
      branch,
      jsonData: paginatedData, // Send the paginated chunk instead of the whole jsonData
      totalItems: jsonData.length, // Total count of items in the JSON data
      totalDebitAmount, // Total sum of debit amounts
      totalCreditAmount, // Total sum of credit amounts
      dateRange,
    }

    // console.log(`=====ACCOUNT WITH ${arrayData} FETCHED SUCCESSFULLY=====`)

    // Store the paginated data in the cache
    const cacheDuration = 60 * 60 * 1000 // 1 hour
    memoryCache.put(cacheKey, arrayData, cacheDuration)
    console.log('=====CACHE DATA=====', cachedData)

    res.status(200).send(arrayData)
  } catch (error) {
    console.log(error)
    res.status(500).send('Server Error')
  }
})

export const deleteAccount = asyncHandler(async (req, res) => {
  const { accountIds } = req.body
  console.log('============Delete accountIds===========', accountIds)

  try {
    // Find the accounts to be deleted from the database
    const accountsToDelete = await Account.find({ _id: { $in: accountIds } })

    if (!accountsToDelete || accountsToDelete.length === 0) {
      return res.status(404).json({ error: 'Accounts not found' })
    }

    // Delete the accounts from the database
    await Account.deleteMany({ _id: { $in: accountIds } })

    // Delete the associated files from Cloudinary
    const publicIdsToDelete = accountsToDelete.map((account) => {
      // Extract the public ID from the fileUrl
      const cloudinaryPublicId = account.fileUrl.split('/').pop().split('.')[0]
      return cloudinaryPublicId
    })

    // Delete files from Cloudinary
    cloudinary.api.delete_resources(publicIdsToDelete, (error, result) => {
      if (error) {
        console.error('Error deleting files from Cloudinary:', error)
        return res
          .status(500)
          .json({ error: 'Error deleting files from Cloudinary' })
      }

      console.log('Files deleted from Cloudinary:', publicIdsToDelete)
      res
        .status(200)
        .json({ message: 'Accounts and files deleted successfully' })
    })
  } catch (error) {
    console.error('Error deleting accounts:', error)
    res.status(500).json({ error: error.message })
  }
})

export const getAccountToReconcile = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params
    console.log('>>>Error ID<<<<<', id)

    // Check if the paginated data is already in the cache
    const cacheKey = `reconcilationData_${id}`
    const cachedData = memoryCache.get(cacheKey)

    if (cachedData) {
      console.log('=====ACCOUNT DATA FETCHED FROM CACHE=====', cachedData)
      return res.status(200).send(cachedData) // Return the cached data and stop further execution
    }

    // If not in cache, fetch the data from the database
    const account = await Account.findById({ _id: id })

    // Check if the account exists and has a file associated with it
    if (!account || !account.fileUrl) {
      res.status(404)
      throw new Error('Account not found or file URL not provided')
    }

    const { _id, name, number, bank, branch, fileUrl } = account

    console.log('<<<<FileUrl>>>>>>>', fileUrl)

    const fileBuffer = await FileDownload(fileUrl)

    const processedData = await handleFileDownload(fileBuffer, fileUrl)
    const { jsonData, totalCreditAmount, totalDebitAmount, dateRange } =
      processedData

    const arrayData = {
      _id,
      name,
      number,
      bank,
      branch,
      jsonData,
      totalItems: jsonData.length,
      totalDebitAmount,
      totalCreditAmount,
      dateRange,
    }

    const cacheDuration = 60 * 60 * 1000 // 1 hour
    memoryCache.put(cacheKey, arrayData, cacheDuration)
    console.log('=====CACHE DATA=====', cachedData)

    res.status(200).send(arrayData)
  } catch (error) {
    console.log(error)
    res.status(500)
    throw new Error('Server Error')
  }
})

export const getOtherAccounts = asyncHandler(async (req, res) => {
  try {
    let { accountIds } = req.query

    const processedAccountsData = []
    console.log('>>>>ACCOUNTS ID>>>', accountIds)

    // Loop through the array of account IDs
    //   for (const accountId of accountIds) {
    //     const cachedData = memoryCache.get(cacheKey)

    //     if (cachedData !== {}) {
    //       console.log('=====OTHER ACCOUNT CACHE DATA=====', cachedData)
    //       processedAccountsData.push({ accountId, processedData: cachedData })
    //     } else {
    //     // Query the database to get the account details (including the file URL)
    //   }
    // }

    const accounts = await Account.find({ _id: { $in: accountIds } }).select(
      'fileUrl'
    )

    if (!accounts) {
      console.error(`Account not found }`)
    }

    console.log('<<<Accounts>>>>>', accounts)
    for (const account of accounts) {
      const accountId = account._id
      const cacheKey = `reconcilationData_${accountId}`

      // Retrieve the file from Cloudinary using the file URL
      const fileBuffer = await FileDownload(account.fileUrl)

      // Process the file based on its extension
      const processedData = await handleFileDownload(
        fileBuffer,
        account.fileUrl
      )

      // Save processed data in the cache
      const cacheDuration = 60 * 60 * 1000 // 1 hour
      memoryCache.put(cacheKey, processedData, cacheDuration)

      processedAccountsData.push({ accountId, processedData })
    }

    // Respond with the processed data as the response
    console.log('>>>>PROCESSEDACCDATA>>>', processedAccountsData)

    res.status(200).json(processedAccountsData)
  } catch (error) {
    console.error('Error processing accounts:', error)
    res
      .status(500)
      .json({ error: 'An error occurred while processing accounts' })
  }
})

export const updateReconciliationStatus = asyncHandler(async (req, res) => {
  try {
    const { accountId } = req.query // Get the accountId from the query parameters

    // Find the account in the database by its ID
    const account = await Account.findById(accountId)

    if (!account) {
      return res.status(404).json({ error: 'Account not found' })
    }

    // Update the reconciliation status to true (if it's not already true)
    if (!account.reconciled) {
      account.reconciled = true
      await account.save()
    }

    res
      .status(200)
      .json({ message: 'Reconciliation status updated successfully', account })
  } catch (error) {
    console.error('Error updating reconciliation status:', error)
    res.status(500).json({
      error: 'An error occurred while updating the reconciliation status',
    })
  }
})

// Controller to handle multiple account IDs

// export const getOtherAccounts = asyncHandler(async (req, res) => {
//   try {
//     const { accountIds } = req.query

//     // Parse the query parameter as an array of ObjectIDs
//     const parsedAccountIds = accountIds.map(
//       (id) => new mongoose.Types.ObjectId(id)
//     )

//     const processedAccountsData = []
//     console.log('>>>>ACCOUNTS ID>>>', accountIds)
//     console.log('>>>>PROCESSEDACCDATA>>>', processedAccountsData)

//     // Loop through the array of account IDs
//     for (const accountId of parsedAccountIds) {
//       const cacheKey = `reconcilationData_${accountId}`
//       const cachedData = memoryCache.get(cacheKey)

//       if (cachedData) {
//         console.log('=====OTHER ACCOUNT CACHE DATA=====', cachedData)
//         processedAccountsData.push({ accountId, processedData: cachedData })
//       } else {
//         // Query the database to get the account details (including the file URL)
//         const account = await Account.findById(accountId)

//         if (!account || !account.fileUrl) {
//           console.error(
//             `Account not found or file URL not provided for account with ID: ${accountId}`
//           )
//           continue // Skip to the next account
//         }

//         // Retrieve the file from Cloudinary using the file URL
//         const fileBuffer = await FileDownload(account.fileUrl)

//         // Process the file based on its extension
//         const processedData = await handleFileDownload(
//           fileBuffer,
//           account.fileUrl
//         )

//         processedAccountsData.push({ accountId, processedData })

//         const cacheDuration = 60 * 60 * 1000 // 1 hour
//         memoryCache.put(cacheKey, processedData, cacheDuration)
//       }
//     }

//     // Respond with the processed data as the response
//     res.status(200).json(processedAccountsData)
//   } catch (error) {
//     console.error('Error processing accounts:', error)
//     res
//       .status(500)
//       .json({ error: 'An error occurred while processing accounts' })
//   }
// })

// export const getAccountToReconcile = asyncHandler(async (req, res) => {})
// const { parsedAccountIds } = req.query
// console.log('============Reconcile accountIds===========', req.query)

// try {
//   const accounts = await Account.find({ _id: { $in: accountIds } }).select(
//     'fileUrl'
//   )

//   if (!accounts) {
//     res.status(404)
//     return new Error('Account(s) not found')
//   }
//   console.log('----accounts----', accounts)

//   // const fileBuffer = await FileDownload(accounts.fileUrl)

//   console.log(`=====ACCOUNT WITH ${accountIds} FETCHED SUCCESSFULLY=====`)
//   res.status(200).json(selectedAccounts)
// } catch (error) {
//   console.log('>>>>>>>error<<<<<<<', error)
//   res.status(500)
//   throw new Error('Error fetching Account to Reconcile: ', error)
// }

// const processedData = await handleFileDownload(fileBuffer, fileUrl)

//     const { jsonData, totalCreditAmount, totalDebitAmount, dateRange } =
//       processedData

//     const selectedAccounts = accounts.map((selectedAccount) => {
//       const selectedAccountData = selectedAccount.jsonData
//       const jsonString = selectedAccountData.toString()
//       console.log('----jsonString----', jsonString)
//       const arrayData = JSON.parse(jsonString)
//       console.log('----arrayData----', arrayData)
//       return arrayData
//     })

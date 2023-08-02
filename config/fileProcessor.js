import xlsx from 'xlsx'
import csvParser from 'csv-parser'
import axios from 'axios'
import { Readable } from 'stream'

const transformKeys = (obj) => {
  const transformedObj = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const transformedKey = key.toLowerCase().replace(/\s+/g, '')
      transformedObj[transformedKey] = obj[key].toString().trim()
    }
  }
  return transformedObj
}

const formatDate = (inputDate) => {
  const date = new Date(inputDate)
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear().toString()
  // console.log('DATE CONVERTOR', inputDate, `${day}/${month}/${year}`)
  return `${day}/${month}/${year}`
}

const transformXLSXData = (originalData) => {
  const transformedData = []
  let totalDebitAmount = 0
  let totalCreditAmount = 0
  let firstDate = null
  let lastDate = null

  for (const row of originalData) {
    if (!row['postdate']) {
      // If the first cell is empty
      if (Object.values(row).every((cell) => !cell)) {
        // If the whole row is empty, skip it
        continue
      } else {
        // Concatenate the cell data to its corresponding cell in the row above
        for (const [key, value] of Object.entries(row)) {
          if (value) {
            row[key] = row[key] ? `${row[key]} ${value}` : value
          }
        }
      }
    } else {
      // If the first cell is not empty, add the current row to the transformed data
      transformedData.push(row)
      console.log('<<<PROCESSING>>>', row)

      // Update firstDate and lastDate
      const postDate = new Date(row['postdate'])
      if (!firstDate || postDate < firstDate) {
        firstDate = postDate
      }
      if (!lastDate || postDate > lastDate) {
        lastDate = postDate
      }
    }

    // Calculate totalDebitAmount and totalCreditAmount
    totalDebitAmount += parseFloat(row.debitamount?.replace(/,/g, '')) || 0
    totalCreditAmount += parseFloat(row.creditamount?.replace(/,/g, '')) || 0
  }

  // Normalize creditamount and balance fields
  const jsonData = transformedData.map((row) => {
    const newRow = { ...row }
    newRow.creditamount =
      parseFloat(
        newRow.creditamount && newRow.creditamount.replace(/,/g, '')
      ) || 0
    newRow.balance =
      parseFloat(newRow.balance && newRow.balance.replace(/,/g, '')) || 0

    // Format the postdate and valuedate to "dd/mm/yyyy" format
    if (newRow.postdate) {
      newRow.postdate = formatDate(newRow.postdate)
    }
    if (newRow.valuedate) {
      newRow.valuedate = formatDate(newRow.valuedate)
    }

    return newRow
  })

  // Format the first and last dates in the desired format "dd/mm/yyyy-dd/mm/yyyy"
  const dateRange = `${formatDate(firstDate, 'dd/mm/yyyy')} - ${formatDate(
    lastDate,
    'dd/mm/yyyy'
  )}`

  return { jsonData, totalDebitAmount, totalCreditAmount, dateRange }
}

const transformCSVData = (originalData) => {
  const transformedData = []
  let totalDebitAmount = 0
  let totalCreditAmount = 0
  let firstDate = null
  let lastDate = null

  for (const row of originalData) {
    if (!row['postdate']) {
      // If the first cell is empty
      if (Object.values(row).every((cell) => !cell)) {
        // If the whole row is empty, skip it
        continue
      } else {
        // Concatenate the cell data to its corresponding cell in the row above
        for (const [key, value] of Object.entries(row)) {
          if (value) {
            row[key] = row[key] ? `${row[key]} ${value}` : value
          }
        }
      }
    } else {
      // If the first cell is not empty, add the current row to the transformed data
      transformedData.push(row)
      console.log('<<<PROCESSING>>>', row)
      // Update firstDate and lastDate
      const postDate = new Date(row['postdate'])
      if (!firstDate || postDate < firstDate) {
        firstDate = postDate
      }
      if (!lastDate || postDate > lastDate) {
        lastDate = postDate
      }
    }

    // Calculate totalDebitAmount and totalCreditAmount
    totalDebitAmount += parseFloat(row.debitamount?.replace(/,/g, '')) || 0
    totalCreditAmount += parseFloat(row.creditamount?.replace(/,/g, '')) || 0
  }

  // Normalize creditamount and balance fields
  const jsonData = transformedData.map((row) => {
    const newRow = { ...row }
    newRow.creditamount =
      parseFloat(
        newRow.creditamount && newRow.creditamount.replace(/,/g, '')
      ) || 0
    newRow.balance =
      parseFloat(newRow.balance && newRow.balance.replace(/,/g, '')) || 0

    return newRow
  })

  // Format the first and last dates in the desired format "dd/mm/yyyy-dd/mm/yyyy"
  const dateRange = `${formatDate(firstDate, 'dd/mm/yyyy')} - ${formatDate(
    lastDate,
    'dd/mm/yyyy'
  )}`

  return { jsonData, totalDebitAmount, totalCreditAmount, dateRange }
}

export const handleXlsxUpload = (fileBuffer) => {
  try {
    const fileData = []
    const workbook = xlsx.read(fileBuffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const range = xlsx.utils.decode_range(sheet['!ref'])

    // Check if the first row contains the headers
    const headerRow = range.s.r

    // Process each row in the sheet, skipping the first row (header row)
    for (let rowNum = headerRow + 1; rowNum <= range.e.r; rowNum++) {
      const rowData = {}
      let isEmptyRow = true

      // Iterate through each cell in the row
      for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
        const cellAddress = xlsx.utils.encode_cell({ r: rowNum, c: colNum })
        const cell = sheet[cellAddress]
        const cellValue = cell ? cell.v : undefined

        // Check if the cell has any value
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          isEmptyRow = false

          // Use the column header as the key and cell value as the value in the row data
          const columnHeader =
            sheet[xlsx.utils.encode_cell({ r: range.s.r, c: colNum })]?.v || ''

          // Format the "postdate" and "valuedate" values to "dd/mm/yyyy"
          if (
            columnHeader.toLowerCase() === 'postdate' ||
            columnHeader.toLowerCase() === 'valuedate'
          ) {
            rowData[columnHeader.toLowerCase()] = formatDate(cellValue)
          } else {
            rowData[columnHeader.toLowerCase()] = String(cellValue) // Convert other values to strings
          }
        }
      }

      // Check if the row contains any non-empty values
      if (!isEmptyRow) {
        fileData.push(transformKeys(rowData))
      }
    }

    return transformXLSXData(fileData)
  } catch (error) {
    console.log('Could not process XLSX:', error)
    throw new Error('Could not process XLSX')
  }
}

const handleCsvUpload = async (fileBuffer) => {
  return new Promise((resolve, reject) => {
    const jsonData = []

    // Convert the file buffer to a readable stream
    const fileStream = Readable.from(fileBuffer)

    // Create a csv-parser instance
    const parser = fileStream.pipe(csvParser())

    // Handle each data chunk as it becomes available
    parser.on('data', (data) => {
      // Normalize the data object by converting keys to lowercase and removing whitespaces
      const normalizedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key.replace(/\s+/g, '').toLowerCase().trim(),
          value,
        ])
      )
      jsonData.push(normalizedData)
    })

    // Handle the end of the stream
    parser.on('end', () => {
      const transformedData = transformCSVData(jsonData) // Transform the data
      resolve(transformedData)
    })

    // Handle errors
    parser.on('error', (error) => {
      reject(error)
    })
  })
}

const handleFileDownload = async (fileBuffer, fileUrl) => {
  try {
    // Download the file from Cloudinary and get the file buffer

    if (fileUrl.endsWith('.xlsx')) {
      // Process Excel .xlsx file
      const jsonData = await handleXlsxUpload(fileBuffer)
      return jsonData
    } else if (fileUrl.endsWith('.csv')) {
      // Process CSV file
      const jsonData = await handleCsvUpload(fileBuffer)
      return jsonData
    } else {
      // Invalid file format
      throw new Error(
        'Invalid file format. Please upload an Excel (.xlsx) or CSV file.'
      )
    }
  } catch (error) {
    console.log(error)
    throw new Error('Server error')
  }
}

const FileDownload = async (fileUrl) => {
  try {
    const response = await axios.get(fileUrl, {
      responseType: 'arraybuffer', // Important to handle binary data like files
    })

    // Return the file buffer and filename
    return response.data
  } catch (error) {
    console.log('Error retrieving the file from Cloudinary:', error)
    throw new Error('Server error')
  }
}

export { handleFileDownload, FileDownload }

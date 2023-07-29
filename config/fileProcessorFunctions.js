import fs from 'fs'
import csvParser from 'csv-parser'
import xlsx from 'xlsx'

export const normalizeKeys = (obj) => {
  const normalizedObj = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const normalizedKey = key.toUpperCase()
      normalizedObj[normalizedKey] = obj[key]
    }
  }
  return normalizedObj
}

export const convertArrayToBuffer = (arrayData) => {
  const toString = JSON.stringify(arrayData)
  const bufferData = Buffer.from(toString)
  return bufferData
}

export const convertBufferToArray = (bufferData) => {
  const jsonString = bufferData.toString()
  const transactionsArray = JSON.parse(jsonString)
  return transactionsArray
}

export const concatenateObjects = (transactionArray) => {
  const result = []

  for (let i = 0; i < transactionArray.length; i++) {
    const obj = transactionArray[i]

    if (obj.postDate !== '') {
      result.push(obj)
    } else {
      const previousObj = result[result.length - 1]
      for (const prop in obj) {
        if (obj[prop] !== '' && obj[prop] !== '') {
          previousObj[prop] = previousObj[prop]
            ? previousObj[prop] + ' ' + obj[prop]
            : obj[prop]
        }
      }
    }
  }

  return result
}

export const parseExcelFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const fileData = []

    const workbook = xlsx.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const range = xlsx.utils.decode_range(sheet['!ref'])

    // Check if the first row contains the field names (headers)
    const headerRow = range.s.r
    const headerCellAddress = xlsx.utils.encode_cell({
      r: headerRow,
      c: range.s.c,
    })
    const headerCell = sheet[headerCellAddress]
    const isFirstRowHeader = headerCell && headerCell.t === 's'

    // Determine the start row based on whether the first row contains headers or not
    const startRow = isFirstRowHeader ? headerRow + 1 : range.s.r // not in use because I will convert the excel file to csv

    // Convert the Excel file to CSV format
    const csvFilePath = filePath.replace(/\.xlsx?$/, '.csv')
    xlsx.writeFile(workbook, csvFilePath, { bookType: 'csv' })

    // Use csv-parser to parse the CSV file
    fs.createReadStream(csvFilePath)
      .pipe(csvParser())
      .on('data', (data) => {
        // Normalize the keys to lowercase and store the row data in the array
        const normalizedRowData = normalizeKeys(data)
        // Check if the row contains any non-empty values
        const isEmptyRow = Object.values(normalizedRowData).every(
          (value) => value === null || value === undefined || value === ''
        )
        if (!isEmptyRow) {
          fileData.push(normalizedRowData)
        }
      })
      .on('end', () => {
        // Delete the temporary CSV file after parsing is complete
        fs.unlinkSync(csvFilePath)
        resolve(fileData)
      })
      .on('error', (error) => {
        // Delete the temporary CSV file on error and reject the promise
        fs.unlinkSync(csvFilePath)
        reject(error)
      })
  })
}

//function to parse csv file
export const parseCsvFile = (filePath) => {
  return new Promise((resolve, reject) => {
    const fileData = []

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => {
        // Normalize the keys to lowercase and store the row data in the array
        const normalizedRowData = normalizeKeys(data)
        fileData.push(normalizedRowData)
      })
      .on('end', () => {
        resolve(fileData)
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

//Actual function to do the parsing
export const parseFile = (file) => {
  const filePath = file.path
  if (
    file.mimetype.includes(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  ) {
    return parseExcelFile(filePath)
  } else if (file.mimetype.includes('csv')) {
    return parseCsvFile(filePath)
  } else {
    return Promise.reject(
      new Error('Invalid file type. Please provide a valid Excel or CSV file.')
    )
  }
}

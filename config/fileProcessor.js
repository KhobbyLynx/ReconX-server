import xlsx from 'xlsx'
import csvtojson from 'csvtojson'
import csvParser from 'csv-parser'
import { createReadStream, createWriteStream } from 'fs'
import { pipeline } from 'stream/promises'
import { Transform } from 'stream'
import fs from 'fs'

const normalizeKeys = (obj) => {
  const normalizedObj = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const normalizedKey = key.toUpperCase()
      normalizedObj[normalizedKey] = obj[key]
    }
  }
  return normalizedObj
}

const handleXlsxUpload = (file) => {
  const filePath = file.path

  try {
    const jsonData = []
    const workbook = xlsx.readFile(filePath)
    const sheetNames = workbook.SheetNames

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const sheetData = xlsx.utils.sheet_to_json(sheet, { raw: true })
      jsonData.push(...sheetData)
    }

    return jsonData
  } catch (error) {
    console.log('Could not process XLSX:', error)
    throw new Error('Could not process XLSX')
  }
}
// Function to handle the file upload and conversion to JSON for CSV files
const handleCsvUpload = async (file) => {
  const filename = file.filename

  return new Promise((resolve, reject) => {
    const jsonData = []

    fs.createReadStream(file.path)
      .pipe(csvParser())
      .on('data', (data) => {
        jsonData.push(data)
      })
      .on('end', () => {
        resolve(jsonData)
      })
      .on('error', (error) => {
        reject(error)
      })
  })
}

const handleFileUpload = async (file) => {
  const filename = file.filename
  try {
    if (filename.endsWith('.xlsx')) {
      // Process Excel .xlsx file
      const jsonData = await handleXlsxUpload(file)
      return jsonData
    } else if (filename.endsWith('.csv')) {
      // Process CSV file
      const jsonData = await handleCsvUpload(file)
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

export { handleFileUpload }

// const handleCsvUpload = async (file) => {
//   const fileStream = createReadStream(file.path)
//   const filename = file.filename
//   const jsonData = []

//   try {
//     await pipeline(
//       fileStream,
//       csvParser(),
//       new Transform({
//         objectMode: true,
//         transform(chunk, encoding, callback) {
//           jsonData.push(chunk)
//           callback()
//         },
//         flush(callback) {
//           // Pass the jsonData to the next stream in the pipeline
//           this.push(jsonData)
//           callback()
//         },
//       })
//     )

//     return jsonData
//   } catch (error) {
//     console.log('Error Processing the CSV file', error)
//     throw new Error('Server error')
//   }
// }
// Function to handle the file upload and conversion to JSON

// const dataProcessor = Transform({
//   objectMode: true,
//   transform(chunk, enc, callback) {
//     const jsonData = chunk.toString()
//     const data = JSON.parse(jsonData)

//     return callback(null, JSON.stringify(data))
//     // return callback(null, JSON.stringify(data))
//   },
// })

// function processObjects(fileArray) {
//   let currentDate = null
//   let accumulatedParticulars = ''
//   let filteredArray = []

//   for (const obj of fileArray) {
//     if (obj['Post Date']) {
//       if (accumulatedParticulars !== '') {
//         // If there are accumulated particulars, create a new object and push it.
//         const mergedObject = {
//           ...filteredArray[filteredArray.length - 1],
//           Particulars: accumulatedParticulars,
//         }
//         filteredArray[filteredArray.length - 1] = mergedObject
//         accumulatedParticulars = '' // Reset the accumulated particulars.
//       }
//       currentDate = obj['Post Date']
//       filteredArray.push(obj)
//     } else if (currentDate && obj['Particulars']) {
//       // If the object doesn't have a date but has particulars, accumulate the particulars.
//       accumulatedParticulars += ' ' + obj['Particulars']
//     }
//   }

//   // Add any remaining accumulated particulars to the last object.
//   if (accumulatedParticulars !== '') {
//     const mergedObject = {
//       ...filteredArray[filteredArray.length - 1],
//       Particulars: accumulatedParticulars,
//     }
//     filteredArray[filteredArray.length - 1] = mergedObject
//   }

//   // Filter out the objects with dates.
//   filteredArray = filteredArray.filter((obj) => !obj['Post Date'])

//   return filteredArray
// }

// Function to handle the file upload and conversion to JSON for Excel files

// Function to read Excel file and convert to buffer
// function readExcelToBuffer(file) {
//   const workbook = xlsx.readFile(file)
//   const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })
//   return excelBuffer
// }

// //function to parse csv file
// export const parseCsvFile = (filePath) => {
//   return new Promise((resolve, reject) => {
//     const fileData = []

//     fs.createReadStream(filePath)
//       .pipe(csvParser())
//       .on('data', (data) => {
//         // Normalize the keys to lowercase and store the row data in the array
//         const normalizedRowData = normalizeKeys(data)
//         fileData.push(normalizedRowData)
//       })
//       .on('end', () => {
//         resolve(fileData)
//       })
//       .on('error', (error) => {
//         reject(error)
//       })
//   })
// }

// async function convertExcelToJSON(bufferData) {
//   const workbook = xlsx.read(bufferData, { type: 'buffer' })
//   const sheetName = workbook.SheetNames[0]
//   const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
//     header: 'A',
//   })
//   return jsonData
// }

import xlsx from 'xlsx'
import csvtojson from 'csvtojson'

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

const handleXlsxUpload = (dataFile) => {
  const workbook = xlsx.read(dataFile.data, { cellDates: true })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const jsonData = xlsx.utils.sheet_to_json(sheet)
  // const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  // console.log('=========JSON', json)
  // const jsonData = processObjects(json)
  console.log('===============JSONFORMATED', jsonData)
  return excelBuffer
}

// Function to handle the file upload and conversion to JSON for CSV files
const handleCsvUpload = async (dataFile) => {
  try {
    const jsonData = await csvtojson().fromFile(`uploads/${dataFile.name}`)
    return jsonData
  } catch (error) {
    throw new Error('Server error')
  }
}

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

async function convertExcelToJSON(bufferData) {
  const workbook = xlsx.read(bufferData, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]
  const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 'A',
  })
  return jsonData
}

// Function to handle the file upload and conversion to JSON
const handleFileUpload = async (dataFile) => {
  try {
    if (dataFile.name.endsWith('.xlsx')) {
      // Process Excel .xlsx file
      const jsonData = await handleXlsxUpload(dataFile)
      return jsonData
    } else if (dataFile.name.endsWith('.csv')) {
      // Process CSV file
      const jsonData = await handleCsvUpload(dataFile)
      return jsonData
    } else {
      // Invalid file format
      res.status(400)
      throw new Error(
        'Invalid file format. Please upload an Excel (.xlsx) or CSV file.'
      )
    }
  } catch (error) {
    res.status(500)
    throw new Error('Server error')
  }
}

export { handleFileUpload, convertExcelToJSON }

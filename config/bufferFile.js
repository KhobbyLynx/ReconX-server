// import { createReadStream } from 'fs'
// import { pipeline } from 'stream'
// import { promisify } from 'util'
// import parseCSV from 'csv-parser'
// import xlsx from 'xlsx'

// const pipelineAsync = promisify(pipeline)

// // Function to handle the file upload and conversion to buffer for CSV files
// // Function to handle the file upload and conversion to buffer for CSV files
// const handleCsvUpload = async (file) => {
//   try {
//     const bufferChunks = []

//     await pipelineAsync(
//       createReadStream(file.path),
//       parseCSV(),
//       async function* (source) {
//         for await (const data of source) {
//           // Process the CSV data if needed (optional)
//           // For example, you can transform the data before pushing it into the bufferChunks array.
//           // Here, we are pushing the original data as it is.
//           bufferChunks.push(Buffer.from(JSON.stringify(data)))
//         }
//       }
//     )

//     const bufferData = Buffer.concat(bufferChunks)
//     return bufferData
//   } catch (error) {
//     console.log('Error processing the CSV file:', error)
//     throw new Error('Server error')
//   }
// }
// // Function to handle the file upload and conversion to buffer for XLSX files
// const handleXlsxUpload = async (file) => {
//   try {
//     const bufferData = await pipelineAsync(createReadStream(file.path))
//     return bufferData
//   } catch (error) {
//     console.log('Error processing the XLSX file:', error)
//     throw new Error('Server error')
//   }
// }

// const handleFileUpload = async (file) => {
//   const filename = file.filename
//   try {
//     if (filename.endsWith('.xlsx')) {
//       // Process Excel .xlsx file and return buffer
//       const bufferData = await handleXlsxUpload(file)
//       return bufferData
//     } else if (filename.endsWith('.csv')) {
//       // Process CSV file and return buffer
//       const bufferData = await handleCsvUpload(file)
//       return bufferData
//     } else {
//       // Invalid file format
//       throw new Error(
//         'Invalid file format. Please upload an Excel (.xlsx) or CSV file.'
//       )
//     }
//   } catch (error) {
//     console.log(error)
//     throw new Error('Server error')
//   }
// }

// export { handleFileUpload }

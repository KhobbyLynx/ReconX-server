import { createReadStream } from 'fs'
import { pipeline } from 'stream'
import { promisify } from 'util'
import { csvParser, xlsxParser } from '../utils/fileParsers' // Import your file parsers

const pipelineAsync = promisify(pipeline)

export const handleFileUpload = async (file) => {
  const filename = file.filename
  const fileStream = createReadStream(file.path)

  try {
    // Determine the file type and use the appropriate parser
    if (filename.endsWith('.csv')) {
      // Process CSV file
      const jsonData = await pipelineAsync(fileStream, csvParser())
      return jsonData
    } else if (filename.endsWith('.xlsx')) {
      // Process XLSX file
      const jsonData = await pipelineAsync(fileStream, xlsxParser())
      return jsonData
    } else {
      throw new Error('Invalid file format. Please upload a CSV or XLSX file.')
    }
  } catch (error) {
    console.log('Error processing the file:', error)
    throw new Error('Error processing the file')
  }
}

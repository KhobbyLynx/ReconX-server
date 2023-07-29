import multer from 'multer'
import path from 'path'

export const multerMiddleware = (options = {}) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, options.dest || 'uploads')
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      const filename = path.parse(file.originalname).name
      const ext = file.originalname.split('.').pop()
      cb(null, filename + '-' + uniqueSuffix + `.${ext}`)
    },
  })

  const upload = multer({
    storage,
    limits: options.limits || { fileSize: 1024 * 1024 },
    fileFilter:
      options.fileFilter ||
      ((req, file, cb) => {
        const fileTypes =
          /csv|xls|xlsx|application\/vnd.ms-excel|application\/vnd.openxmlformats-officedocument.spreadsheetml.sheet/
        const extname = fileTypes.test(
          path.extname(file.originalname).toLowerCase()
        )
        const mimetype = fileTypes.test(file.mimetype)

        if (mimetype && extname) {
          return cb(null, true)
        } else {
          return cb(new Error('Invalid file type.'))
        }
      }),
  })

  return upload
}

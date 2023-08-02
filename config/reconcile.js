function convertToUniformDateFormat(dateString) {
  // Check if the date string is in the "yyyy-mm-dd" format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const parts = dateString.split('-')
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  // Check if the date string is in the "dd/mm/yyyy" format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
    return dateString
  }

  // Return the original date string if it's not in the expected formats
  return dateString
}

function reconcile(singleAccount, multipleAccounts, delayDays = 0) {
  multipleAccounts = multipleAccounts.filter((entry) => {
    const creditAmount = entry.creditamount
    if (creditAmount) {
      // Add a check to ensure creditAmount is defined before using replace
      const parsedCreditAmount = parseFloat(creditAmount)
      return !isNaN(parsedCreditAmount)
    }
    return false
  })

  console.log('>>>>SINGLE ACCOUNT<<<<<', singleAccount)
  console.log('>>>>MULTI ACCOUNT<<<<<', multipleAccounts)

  console.log('SINGLE ACCOUNT LENGTH', singleAccount?.length)
  console.log('MULTI ACC LENGTH', multipleAccounts?.length)

  const matched = []
  const misMatched = []

  for (const singleEntry of singleAccount) {
    const dateStr = singleEntry.postdate
    const formatedDateStr = convertToUniformDateFormat(dateStr)

    const [day, month, year] = formatedDateStr.split('/').map(Number)
    const debitDate = new Date(year, month - 1, day)
    const startTimestamp = debitDate.getTime()
    const endTimestamp = debitDate.getTime() + delayDays * 86400000

    const debitAmount = parseFloat(singleEntry.debitamount)

    let foundMatch = false

    for (let i = 0; i < multipleAccounts.length; i++) {
      const entry = multipleAccounts[i]
      const dateStr = entry.postdate
      const formatedDateStr = convertToUniformDateFormat(dateStr)
      const [day, month, year] = formatedDateStr.split('/').map(Number)
      const creditDate = new Date(year, month - 1, day)
      const timestamp = creditDate.getTime()

      const creditAmount = parseFloat(entry.creditamount)

      if (
        timestamp >= startTimestamp &&
        timestamp <= endTimestamp &&
        debitAmount === creditAmount
      ) {
        matched.push({ singleEntry, matchedEntry: entry })
        foundMatch = true
        multipleAccounts.splice(i, 1)
        break
      }
    }

    if (!foundMatch) {
      misMatched.push(singleEntry)
    }
  }

  return { matched, misMatched }
}

export { reconcile }

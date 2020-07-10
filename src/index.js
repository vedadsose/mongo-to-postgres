const { ArgumentParser } = require('argparse')
const { readFile, writeFile } = require('fs')
const { pipe, keys, join, map } = require('ramda')

const { getFieldTypes, parseEntry } = require('./utils')

const parser = new ArgumentParser({
  version: '1.0.0',
  addHelp: true,
  description: 'Convert JSON file to an SQL dump'
})

parser.addArgument('file', {
  help: 'Path to the json file'
})

parser.addArgument(['-n', '--name'], {
  help: 'Table name'
})

parser.addArgument(['-o', '--out'], {
  help: 'Output SQL file'
})

const args = parser.parseArgs()

// Validation
if (!args.name) {
  console.log('Table name argument is required')
  return
} else {
  if (!args.name[0].match(/[a-z]/i)) {
    console.log('First characther of the table name must be a letter')
    return
  }
}

if (!args.out) {
  console.log('Output argument is required')
  return
}

readFile(args.file, 'UTF-8', (error, data) => {
  if (error) {
    console.log('File could not be opened')
    console.log(error)
    return
  }

  const entries = JSON.parse(data)

  console.log('Starting to compute the schema...')

  const schema = entries.reduce(
    (current, entry) => ({ ...current, ...getFieldTypes(entry) }),
    {}
  )

  console.log('Creating the SQL query...')

  const fields = keys(schema)
    .map(field => `  ${field} ${schema[field]}`)
    .join(',\n')

  const createTableSQL = `CREATE TABLE IF NOT EXISTS ${args.name} (\n${fields}\n);`

  const entriesSQL = pipe(
    map(parseEntry(args.name, schema)),
    join('\n')
  )(entries)

  const result = [
    '/* TABLE CREATION */',
    createTableSQL,
    '/* FILLING THE DB */',
    entriesSQL
  ].join('\n')

  writeFile(args.out, result, 'UTF-8', error => {
    if (error) {
      console.log('Error writing to file')
      console.log(error)
      return
    }

    console.log('Done.')
  })
})

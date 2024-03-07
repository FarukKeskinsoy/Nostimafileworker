const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const uuid = require('uuid');
const xlsx = require('xlsx');


const app=express()
app.use(express.json())
app.use(cors())
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



// const hostingerdb= mysql.createConnection({
//     host:"193.203.168.40",
//     user:"u758955658_fey",
//     password:"Fey2024!",
//     database:"u758955658_deneme"
// })

const dbConfig = {
    host: "193.203.168.40",
    user: "u758955658_root",
    password: "Faruk7093",
    database: "u758955658_recdo"
  };
  
app.get("/",(req,res)=>{
    res.json("Hello from nostima sql backend")
})

app.get('/nostima/:tableName', (req, res) => {
    const scopedb= mysql.createConnection({
        host:"193.203.168.40",
        user:"u758955658_root",
        password:"Faruk7093",
        database:"u758955658_recdo"
    })
    const tableName = req.params.tableName;
    console.log(tableName);
    scopedb.connect();

    //const query = `SELECT * FROM ${tableName}hp ORDER BY Column_1`;
    //const query = `SELECT * FROM ${tableName}hp ORDER BY Column_1`;
    const query = `SELECT * FROM ${tableName}`;

  
    scopedb.query(query, (error, results, fields) => {
      if (error) {
        if(error.code==="ER_NO_SUCH_TABLE"){
            console.error('Tablo yok');

        }else{
            console.error('Error fetching data:', error);
            res.status(500).json({ error: error.sqlMessage, code:error.code });
            return;
        }
      }
      // Send the fetched data as JSON
      res.json(results);
    });
    scopedb.end()
  });

  const dataWithSira = [{
    Barcode: "", // Row numbering
    ProductName: "",
    ProductFullName: "",
    Category: "",
    Unit: "",
    UnitPrice: "",
    USt: "",
    SellPrice: "",
    Stock: "",
    AlertStock:""
  }];
  

  
  app.post('/nostima/upload/saved-products-table', upload.single('file'), (req, res) => {
    const tableName = `products`;
  
    // Connect to the MySQL database
    const scopedb = mysql.createConnection(dbConfig);
    scopedb.connect();
  
    // Parse the Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const excelData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {header:1});
  
    // Find the header row with the maximum number of columns
    let headerRowIndex;
    let maxColumns = 0;
    excelData.forEach((row, index) => {
      const currentRowColumns = row.filter(cell => cell !== undefined && cell !== null).length;
      if (currentRowColumns > maxColumns) {
        headerRowIndex = index; // Save the index of the current row as the header row index
        maxColumns = currentRowColumns; // Update maxColumns to the new maximum
      }
    });
  
    const headerRow = excelData[headerRowIndex] || [];
    const columnNames = headerRow.map((header, index) => `Column_${index + 1}`);
    
    // Add the "barcode" column as the first column
    
    // Add the "gelen" and "giden" columns
    columnNames.push("gelen");
    columnNames.push("giden");
    columnNames.push("barcode");

  
    // Drop the existing table if it exists
    const dropTableSQL = `DROP TABLE IF EXISTS ${tableName}`;
    scopedb.query(dropTableSQL, (dropTableErr, dropTableResult) => {
      if (dropTableErr) {
        console.error('Error dropping existing table:', dropTableErr);
        res.status(500).send('Internal Server Error');
        return scopedb.end();
      }
  
      // Create the table with dynamic column names
      const createTableSQL = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnNames.map(column => `${column} TEXT`).join(', ')})`;
      scopedb.query(createTableSQL, (createTableErr, createTableResult) => {
        if (createTableErr) {
          console.error('Error creating table:', createTableErr);
          res.status(500).send('Internal Server Error');
          return scopedb.end();
        }
        console.log(`Table ${tableName} created successfully.`);
  
        // Prepare the header row for insertion as data
        const headerDataForInsertion = columnNames.map((_, index) => headerRow[index] || null);
  
        // Filter out the header row and prepare the rest of the data for insertion
        const dataRows = excelData.slice(headerRowIndex + 1).filter(row => row.length > 0);
        
        const dataValues = dataRows.map(row => {
          const rowData = row.slice(0, columnNames.length - 2); // Trim or extend the row data to match column count (excluding "barcode", "gelen", and "giden" columns)
          const paddedRowData = [...rowData, ...Array(columnNames.length-1 - rowData.length).fill(null)]; // Pad with nulls if necessary
          return [...paddedRowData,uuid.v4()]; // Add a unique barcode for each row
        });
  
        // Insert the header row as the first row of data
        dataValues.unshift(headerDataForInsertion);
  
        // Insert data into the table
        const insertDataSQL = `INSERT INTO ${tableName} (${columnNames.join(', ')}) VALUES ?`;
        scopedb.query(insertDataSQL, [dataValues], (insertDataErr, insertDataResult) => {
          if (insertDataErr) {
            console.error('Error inserting data into the table:', insertDataErr);
            res.status(500).send('Internal Server Error');
          } else {
            console.log('Data inserted into the table successfully:', insertDataResult);
            res.status(200).send('Hesap planı başarıyla yüklendi');
          }
          scopedb.end(); // Close the database connection
        });
      });
    });
  });
  app.post('/nostima/upload/template-products-table', upload.single('file'), (req, res) => {

    const scopedb = mysql.createConnection({
      host: "193.203.168.40",
      user: "u758955658_root",
      password: "Faruk7093",
      database: "u758955658_recdo"
    });
  
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const excelData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  
    // Dynamic table name based on uid
    const tableName = `products`;
  
    // Drop the existing table if it exists
    const dropTableSQL = `
      DROP TABLE IF EXISTS ${tableName};
    `;
  
    const createTableSQL = `
      CREATE TABLE ${tableName} (
        Barcode TEXT,
        ProductName TEXT,
        ProductFullName TEXT,
        Category TEXT,
        Unit TEXT,
        UnitPrice TEXT,
        USt TEXT,
        SellPrice TEXT,
        Stock TEXT,
        AlertStock TEXT,
        Prices TEXT
      );
    `;
  
    scopedb.connect();
  
    // Execute the query to drop the table
    scopedb.query(dropTableSQL, (err, dropTableResult) => {
      if (err) {
        console.error('Error dropping the table:', err);
        res.status(500).send('Internal Server Error');
        scopedb.end();
        return;
      }
  
      console.log('Table dropped or did not exist:', dropTableResult);
  
      // Execute the query to create the table
      scopedb.query(createTableSQL, (err, createTableResult) => {
        if (err) {
          console.error('Error creating the table:', err);
          res.status(500).send('Internal Server Error');
          scopedb.end();
          return;
        }
  
        console.log('Table created:', createTableResult);
  
        // Create the Prices array with the first element being UnitPrice
        const pricesArray = excelData.slice(1).map(row => row[7]); // Assuming UnitPrice is at index 5, adjust if needed
        pricesArray.unshift('Prices'); // Add 'Prices' as the first element
  
        // Modify the excelData to include the Prices column and generate UUID for Barcode if null
        const dataWithPricesAndUUID = excelData.map((row, index) => {
          if (index === 0) {
            return [...row, 'Prices'];
          }
          if (!row[0]) { // Assuming Barcode is the first column, adjust index if needed
            row[0] = uuid.v4();
          }
          return [...row, pricesArray[index]];
        });

        const dataToInsert = dataWithPricesAndUUID.slice(1).filter(row => {
            // Assuming ProductName is at index 1, adjust if needed
            return row[1]; // Skip rows where ProductName is falsy (null, undefined, empty string, etc.)
          });
  
        // Insert data into the table
        const insertDataSQL = `
          INSERT INTO ${tableName} (Barcode, ProductName, ProductFullName, Category, Unit, UnitPrice, USt, SellPrice, Stock, AlertStock, Prices)
          VALUES ?
        `;
  
        scopedb.query(insertDataSQL, [dataToInsert], (err, insertDataResult) => {
          if (err) {
            console.error('Error inserting data into the table:', err);
            res.status(500).send('Internal Server Error');
            scopedb.end();
            return;
          }
  
          console.log('Data inserted into the table:', insertDataResult);
          res.status(200).send('Data inserted successfully');
  
          // End the database connection after inserting data
          scopedb.end();
        });
      });
    });
  });
  
//   app.post('/nostima/upload/template-products-table', upload.single('file'), (req, res) => {

//     const scopedb = mysql.createConnection({
//       host: "193.203.168.40",
//       user: "u758955658_root",
//       password: "Faruk7093",
//       database: "u758955658_recdo"
//     });
  
//     const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
//     const sheetName = workbook.SheetNames[0];
//     const excelData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
  
//     // Dynamic table name based on uid
//     const tableName = `products`;
//     const createTableSQL = `
//     CREATE TABLE IF NOT EXISTS products (
//       Barcode TEXT,
//       ProductName VARCHAR(255),
//       ProductFullName VARCHAR(255),
//       Category VARCHAR(22),
//       Unit VARCHAR(22),
//       UnitPrice VARCHAR(22),
//       USt VARCHAR(22),
//       SellPrice VARCHAR(22),
//       Stock VARCHAR(22),
//       AlertStock VARCHAR(22)
//     );
//   `;
  
  
  
//     scopedb.connect();
  
//     // Execute the query to create the table
//     scopedb.query(createTableSQL, (err, createTableResult) => {
//       if (err) {
//         console.error('Error creating the table:', err);
//         res.status(500).send('Internal Server Error');
//         return;
//       }
  
//       console.log('Table created or already exists:', createTableResult);
  
//       // Insert data into the table
//       const insertDataSQL = `
//       INSERT INTO products (Barcode, ProductName, ProductFullName, Category, Unit, UnitPrice, USt, SellPrice, Stock, AlertStock)
//       VALUES ?
//     `;
    
  
//       scopedb.query(insertDataSQL, [excelData.slice(1)], (err, insertDataResult) => {
//         if (err) {
//           console.error('Error inserting data into the table:', err);
//           res.status(500).send('Internal Server Error');
//           return;
//         }
  
//         console.log('Data inserted into the table:', insertDataResult);
//         res.status(200).send('Data inserted successfully');
  
//         // End the database connection after inserting data
//         scopedb.end();
//       });
//     });
//   });
  



app.listen(process.env.PORT || 6001,()=>{
    console.log("nostima sql running !")
});


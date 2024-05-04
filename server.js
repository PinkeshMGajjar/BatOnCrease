var express = require('express');
var app = express();
var mysql = require('mysql');
var fs = require("fs");

const PORT = 8081;
const Host = '192.168.1.2';

var con = mysql.createConnection({
   host: "localhost",
   user: "pinkeshdbs",
   password: "pinkesh008",
   database: "mydb"
});
 
con.connect(function(err) {

   if (err) throw err;
   console.log("Connected!");
});

var server = app.listen(PORT, function () {
   var host = Host 
   var port = server.address().port
   console.log("Example app listening at http://%s:%s", host, port)
})

app.use(express.json());

app.get('/listUsers', function (req, res) {
   fs.readFile( __dirname + "/" + "users.json", 'utf8', function (err, data) {
      console.log( data );
      res.end( data );
   });
})

app.get('/products', function (req, res) {
  fs.readFile( __dirname + "/" + "products.json", 'utf8', function (err, data) {
     console.log( data );
     res.end( data );
  });
})

const query = `
    SELECT 
        \`Match\`.matchId, 
        \`Match\`.matchDate, 
        \`Match\`.matchTime, 
        \`Match\`.isCompleted, 
        \`Match\`.teamA, 
        \`Match\`.teamB, 
        \`Match\`.createdDateTime, 
        Player.playerId, 
        Player.name, 
        Player.selectedPlayer, 
        Player.score, 
        Player.totalScore 
    FROM 
        \`Match\` 
    JOIN 
        Player ON \`Match\`.matchId = Player.matchId;
`;

function executeQueryAndLogResults(query) {
  con.query(query, (error, results) => {
    if (error) {
      throw error;
    }

    console.log(results); // Log the query results
  });
}

function createMatchObject(callback) {
  const query = `
  SELECT 
      \`Match\`.matchId,
      DATE_FORMAT(\`Match\`.matchDate, '%d-%m-%y') AS matchDate,
      \`Match\`.matchTime, 
      \`Match\`.isCompleted, 
      \`Match\`.teamA, 
      \`Match\`.teamB, 
      \`Match\`.createdDateTime,
      \`Match\`.winner,
      Player.playerId, 
      Player.name, 
      Player.selectedPlayer, 
      Player.score, 
      Player.totalScore 
    FROM 
      \`Match\` 
    JOIN 
      Player ON \`Match\`.matchId = Player.matchId
    ORDER BY 
      \`Match\`.matchId DESC;
  `;
  
  con.query(query, (error, results) => {
    if (error) {
      throw error;
    }

    //Organize data into the desired structure
    const matches = {};
    results.forEach(result => {
      if (!matches[result.matchId]) {
        matches[result.matchId] = {
          matchId: result.matchId,
          playersId: "", // You may populate this later if needed
          matchDate: result.matchDate,
          matchTime: result.matchTime,
          isCompleted: result.isCompleted,
          teamA: result.teamA,
          teamB: result.teamB,
          createdDateTime: result.createdDateTime,
          winner: result.winner,
          players: []
        };
      }

      matches[result.matchId].players.push({
        id: result.playerId,
        name: result.name,
        selectedPlayer: result.selectedPlayer,
        score: result.score.split(','), // Splitting score into an array
        totalScore: result.totalScore
      });
    });

    const matchesArray = Object.values(matches);

    // Sort matches array by matchId in descending order
    matchesArray.sort((a, b) => b.matchId - a.matchId);

    // If you need to convert it back to an object
    const sortedMatches = {};
    matchesArray.forEach(match => {
      sortedMatches[match.matchId] = match;
    });

    //Adding winner field based on your logic
    // for (const matchId in matches) {
    //   const match = matches[matchId];
    //   match.winner = ""; // Logic to determine winner goes here
    // }

    //Pass the matches object to the callback function
    callback(matchesArray);
  });
}

// Get match data
app.get('/match', (req, res) => {

  createMatchObject(matches => {

    //console.log(matches); // Log the matches object
    //console.log(JSON.stringify(matches, null, 2));
    // Send the transformed data as JSON response
    //res.json(matches, null, 2);

    const matchesArray = Object.values(matches, null, 2);
    console.log(matchesArray);

    // Send the transformed data as JSON response
    res.json(matchesArray);
  });
});

//Insert Data
app.post('/insertData', (req, res) => {

  const matchId = req.body.matchId;
  const playersId = req.body.playersId;
  const matchDate = req.body.matchDate;
  const matchTime = req.body.matchTime;
  const isCompleted = req.body.isCompleted;
  const teamA = req.body.teamA;
  const teamB = req.body.teamB;
  const winner = req.body.winner;
  const createdDateTime = req.body.createdDateTime;
  const players = req.body.players;

  const matchQuery = `INSERT INTO \`Match\` (matchId, matchDate, matchTime, isCompleted, teamA, teamB, winner,createdDateTime) 
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  con.query(matchQuery, [matchId, matchDate, matchTime, isCompleted, teamA, teamB, winner,createdDateTime], (err, result) => {
    if (err) throw err;

    console.log('Match inserted:', result);

    // Insert into Player table for each player
    players.forEach(player => {
      const { id, name, selectedPlayer, score, totalScore } = player;
      const playerQuery = `INSERT INTO Player (matchId, name, selectedPlayer, score, totalScore) 
                           VALUES (?, ?, ?, ?, ?)`;
      con.query(playerQuery, [matchId, name, selectedPlayer, JSON.stringify(score), totalScore], (err, result) => {
        if (err) throw err;
        console.log('Player inserted:', result);
      });
    });
  });

  res.send('Data inserted successfully into both tables');
});

//Update Data
app.put('/updateData/:matchId', (req, res) => {
  const matchId = req.params.matchId;
  const { matchDate, matchTime, isCompleted, teamA, teamB, winner, players } = req.body;

  // Update the Match table
  const updateMatchQuery = `UPDATE \`Match\` SET matchDate = ?, matchTime = ?, isCompleted = ?, teamA = ?, teamB = ?, winner = ? WHERE matchId = ?`;
  con.query(updateMatchQuery, [matchDate, matchTime, isCompleted, teamA, teamB, winner, matchId], (err, result) => {
    if (err) {
      console.error('Error updating Match table:', err);
      res.status(500).send('Error updating Match table');
      return;
    }
    console.log('Match table updated:', result);
  });

  // Update the Player table
  console.log('Match table updated players :', players);
  players.forEach(player => {
    const { playerId, name, selectedPlayer, score, totalScore } = player;

    const scoreJSON = JSON.stringify(score);
  
    const updatePlayerQuery = `UPDATE Player SET name = ?, selectedPlayer = ?, score = ?, totalScore = ? WHERE playerId = ?`;
    con.query(updatePlayerQuery, [name, selectedPlayer, scoreJSON, totalScore, playerId], (err, result) => {
      if (err) {
        console.error(`Error updating Player ${playerId} in Player table:`, err);
        return;
      }
      console.log(`Player ${playerId} in Player table updated with new data:`, result);
    });
  });

  res.send('Data updated successfully');
});

app.get('/unique-names', async (req, res) => {
  try {
      const connection = await connect();
      const [rows] = await connection.execute('SELECT DISTINCT name FROM Player');
      res.json(rows.map(row => row.name));
  } catch (error) {
      console.error('Error fetching unique names:', error);
      res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a user by ID
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  con.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
    if (err) throw err;
    res.json(results[0]);
  });
});
 
// Create a new user
app.post('/users', (req, res) => {
  const { name, email } = req.body;
  con.query('INSERT INTO users (name, email) VALUES (?, ?)', [name, email], (err, result) => {
    if (err) throw err;
    res.json({ message: 'User added successfully', id: result.insertId });
  });
});
 
// Update a user
app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  con.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, id], (err) => {
    if (err) throw err;
    res.json({ message: 'User updated successfully' });
  });
});
 
// Delete a user
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  con.query('DELETE FROM users WHERE id = ?', [id], (err) => {
    if (err) throw err;
    res.json({ message: 'User deleted successfully' });
  });
});


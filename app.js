const Discord = require('discord.js');
const mysql = require('mysql2/promise');
const config = require('./config.js');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');


const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MEMBERS, Discord.Intents.FLAGS.GUILD_PRESENCES] });
const commandCooldowns = {};






// Connexion à la base de données MySQL
const db = mysql.createPool({
  host: config.dbHost,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbDatabase,
  port: config.dbPort,
});


client.once('ready', () => {
  console.log(`[!] READY ! Logged in as --> ${client.user.username}`);

  let msg_rich = 'Please Config your bot.';


  if (config.richmessage.length !== 1) {

    client.user.setPresence({
      activity: {
        name: config.richmessage,
        type: 'WATCHING'
      },
      status: 'dnd' // 'dnd' signifie "Ne pas déranger"
    });
    
  }else{

    client.user.setPresence({
      activity: {
        name: msg_rich,
        type: 'WATCHING'
      },
      status: 'dnd' // 'dnd' signifie "Ne pas déranger"
    });
    
  }



});



// Événement pour traiter les messages
client.on('message', async (message) => {
  // Vérifier que le message n'est pas envoyé par un bot et commence par le préfixe
  if (message.author.bot) return;
  if (message.content.startsWith(config.prefix)) {



    // COOLDOWN 1MN
  if (!checkCooldown(message.author.id)) {


    const embed = new Discord.MessageEmbed()
    .addField('Informations', 'Veuillez attendre les 1mn de cooldown SVP.')
    .setAuthor("Cooldown", 'https://www.computerhope.com/cdn/linux.png')
    .setColor('#ff0000');



    
    message.channel.send(embed);
    return;
  }
  

    // Séparation de la commande et des arguments
    const args = message.content.slice(1).split(' ');
    const command = args.shift().toLowerCase();
    updateCooldown(message.author.id);

    // Traitement des différentes commandes
    switch (command) {
      case 'givekey':
        giveKey(message, args);
        break;
      case 'delkeybyuser':
        delKeyByUser(message, args);
        break;
      case 'checkkey':
        checkKey(message, args);
        break;
      case 'bulkcreate':
        bulkCreate(message, args);
        break;

      case 'listkeys':
        listKeys(message);
        break;

      case 'help':
        help(message);
        break;

      case 'getipinfo':
        getIPInfo(message, args);
        break;

      case 'mykey':
        showMyKey(message);
        break;


        // SEARCH DB ./DBS

      case 'fivem':
        fivemSearch(message, args);
        break;
    

      

      }
  }
});









async function showMyKey(message) {

  try {
    const authorId = message.author.id;
    const [rows] = await db.query('SELECT * FROM `keys` WHERE user_id = ?', [authorId]);

    if (rows.length > 0) {
      const userKey = rows[0].license_key;
      
      const embed = new Discord.MessageEmbed()
        .setTitle('Vos clefs')
        .setColor('#800080');

        rows.forEach((row) => {
          embed.addField(`> License --> || ${row.license_key} ||`, '\n');
        });

      message.channel.send(embed);
    } else {
      const embed = new Discord.MessageEmbed()
        .setTitle('Clef introuvable')
        .setDescription('Vous n\'avez pas de clefs.')
        .setColor('#FF0000');

      message.channel.send(embed);
    }
  } catch (error) {
    console.error('Error fetching key:', error);
    message.channel.send('Erreur, check console please.');
  }
  
}

async function getIPInfo(message, args) {

  if(message.member.roles.cache.has(config.allowedRoleId)){


    if (args.length !== 1) {
      message.channel.send('Utilisation incorrecte. Exemple: `+getipinfo [IP]`');
      return;
    }
  
    const ip = args[0];
  
    try {
      const response = await fetch(`https://ipinfo.io/${ip}/json`);
      const data = await response.json();
  
      const embed = new Discord.MessageEmbed()
        .addField('🌐 IP', data.ip)
        .addField('🗺 Ville', data.city)
        .addField('🧿 Région', data.region)
        .addField('🚩 Pays', data.country)
        .addField('💳 Fournisseur de services Internet', data.org)
        .setAuthor("Informations IP", 'https://www.computerhope.com/cdn/linux.png')
        .setFooter(`Vous avez demandé les infos de l'IP --> `+"["+ip+"]")
        .setColor('#00ff00');
  
      message.channel.send(embed);
      console.log("[TOOLS] Un utilisateur a demandé les infos de l'ip --> "+ip+"");
    } catch (error) {
      console.error('Erreur lors de la récupération des informations IP:', error);
      message.channel.send('Une erreur s\'est produite lors de la récupération des informations IP.');
    }


  }else{
    message.channel.send("[X] Ptr t'as cru");
  }

}

async function help(message) {


  const embed = new Discord.MessageEmbed()
  .setTitle('Aide')


  .setColor('#800080') // Couleur violette

  .addField('🎇 Commandes dispo\n', `\n :ocean: +givekey [@UTILISATEUR] [KEYNAME] \n :ocean: +delkeybyuser [DISCORDID] \n :ocean: +checkkey [DISCORDID] \n :ocean: +bulkcreate \n :ocean: +listkeys`, true)


  .setAuthor("Natacha's API", 'https://seeklogo.com/images/W/web-dev-logo-E60991AA99-seeklogo.com.png') // Ajoutez l'URL du logo si vous en avez un

  .setFooter(`Rôle d'accès: @${config.allowedRoleId}`);

  message.channel.send(embed);
  console.log("[?] Help message Displayed.")



}






async function listKeys(message) {

  if(message.author.id === config.allowedUserId){

    try {
      const [rows] = await db.query('SELECT user_id, license_key FROM `keys`');
  
      if (rows.length > 0) {
        const embed = new Discord.MessageEmbed()
          .setTitle('Liste des clés')
          .setColor('#3498db');
  
        rows.forEach((row) => {
          embed.addField(`:ocean: ${row.user_id} --> || ${row.license_key} ||`, '\n');
        });
  
        message.channel.send(embed);
        console.log('[+] Liste des clés affichée.');
      } else {
        message.channel.send('[X] Aucune clé trouvée dans la base de données.');
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des clés:', error);
      message.channel.send('Une erreur s\'est produite lors de la récupération des clés.');
    }



  }else{


    message.channel.send('[X] Vous n\'avez ***pas*** la permission.');

    console.log("[X] Pas de perms.")

  }


  
}



// Fonction pour générer une clé et l'ajouter à la base de données
async function giveKey(message, args) {


  if(message.author.id === config.allowedUserId){

    if (args.length < 2) {
      message.channel.send('Utilisation incorrecte. Exemple: `+givekey @Utilisateur Alt`');
      return;
    }
  
    const userId = getUserIdFromMention(args[0]);
    const alt = args[1];
  
    // Votre logique pour générer la clé et l'ajouter à la base de données
    const key = generateKey(alt);
  
    try {
      await db.query('INSERT INTO `keys` (user_id, license_key) VALUES (?, ?)', [userId, key]);
  
      // Envoi des infos dans le channel en embed
      const embed = new Discord.MessageEmbed()
        .setTitle('Nouvelle clé générée')
        .addField('Utilisateur', args[0])
        .addField('Clé de licence', key)
        .setColor('#00ff00');
  
      message.channel.send(embed);

      console.log('[>] Nouvelle clef générée pour l\'utilisateur > '+args[0]+' | Clef > '+key)

    } catch (error) {
      console.error('Erreur lors de l\'ajout de la clé:', error);
      message.channel.send('Une erreur s\'est produite lors de l\'ajout de la clé.');
    }

  }else{


    message.channel.send('[X] Vous n\'avez ***pas*** la permission.');

    console.log("[X] Pas de perms.")
  
  
  }


  
}

// Fonction pour supprimer une clé de la base de données par utilisateur
async function delKeyByUser(message, args) {

  if(message.author.id === config.allowedUserId){

  
  if (args.length !== 1) {
    message.channel.send('Utilisation incorrecte. Exemple: `+delkeybyuser [DISCORD_USERID]`');
    return;
  }

  const userId = args[0];

  // Votre logique pour supprimer la clé de l'utilisateur de la base de données
  try {
    await db.query('DELETE FROM `keys` WHERE user_id = ?', [userId]);
    message.channel.send('Clé supprimée avec succès.');
  } catch (error) {
    console.error('Erreur lors de la suppression de la clé:', error);
    message.channel.send('Une erreur s\'est produite lors de la suppression de la clé.');
  }

  
  }else{


    message.channel.send('[X] Vous n\'avez ***pas*** la permission.');

    console.log("[X] Pas de perms.")
  
  }

}

// Fonction pour vérifier si un utilisateur a une clé dans la base de données
async function checkKey(message, args) {

  if(message.author.id === config.allowedUserId){

    if (args.length !== 1) {
      message.channel.send('Utilisation incorrecte. Exemple: `+checkkey [DISCORDID]`');
      return;
    }
  
    const userId = args[0];
  
    // Votre logique pour vérifier si l'utilisateur a une clé dans la base de données
    try {
      const [rows] = await db.query('SELECT * FROM `keys` WHERE user_id = ?', [userId]);
    
      if (rows.length > 0) {
        const embedok = new Discord.MessageEmbed()
          .setTitle('Vérification de la clé')
          .setDescription('L\'utilisateur a une clé dans la base de données.')
          .setColor('#00ff00');
    
        message.channel.send(embedok);
      } else {
  
  
        const embednah = new Discord.MessageEmbed()
        .setTitle('Vérification de la clé')
        .setDescription('L\'utilisateur n\'a pas de clef.')
        .setColor('#FF0000');
  
        message.channel.send(embednah);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de la clé:', error);
      message.channel.send('Une erreur s\'est produite lors de la vérification de la clé.');
    }
  }else{


    message.channel.send('[X] Vous n\'avez ***pas*** la permission.');

    console.log("[X] Pas de perms.")
  
  }



  
  
}

// Fonction pour créer des clés en vrac et les ajouter à la base de données
async function bulkCreate(message, args) {

  if(message.author.id === config.allowedUserId){
  if (args.length !== 1) {
    message.channel.send('Utilisation incorrecte. Exemple: `+bulkcreate [KEYNAME]`');
    return;
  }

  const alt = args[0];

  // Votre logique pour créer des clés en vrac et les ajouter à la base de données
  const keys = generateBulkKeys(alt);

  try {
    const values = keys.map((key) => ["Bulk-Generated", key.key]);
    await db.query('INSERT INTO `keys` (user_id, license_key) VALUES ?', [values]);

    const embed = new Discord.MessageEmbed()
    .setTitle('Clés rapide')
    .setDescription('5 Clefs on été génerées.')
    .setColor('#FF0000');
  
    message.channel.send(embed);
  } catch (error) {
    console.error('Erreur lors de la création en vrac de clés:', error);
    message.channel.send('Une erreur s\'est produite lors de la création de clés.');
  }

  }else{
    message.channel.send('[X] Vous n\'avez ***pas*** la permission.');

    console.log("[X] Pas de perms.")
  
  
  }
}





// Search funcs 

async function fivemSearch(message, args) {

  if(message.member.roles.cache.has(config.allowedRoleId)){

    const embedwait = new Discord.MessageEmbed()
    .setTitle('La recherche est en cours. Elle peut prendre du temps.')
    .setColor('#3498db')
  message.channel.send(embedwait);

    if (args.length !== 1) {
      message.channel.send('Utilisation incorrecte. Exemple: `+fivem [STRING]`');
      return;
    }
  
    const searchString = args[0].toLowerCase();
    const directoryPath = './dbs';
    const maxResults = 10;  // Limite de résultats
    const results = searchInFiles(directoryPath, searchString, maxResults);
  
    if (results.length > 0) {
      const embed = new Discord.MessageEmbed()
        .setTitle('Résultats de la recherche')
        .setColor('#3498db')
        .setDescription('```' + results.join('\n') + '```');
      message.channel.send(embed);
    } else {
      const embedNoResults = new Discord.MessageEmbed()
        .setTitle('Aucun résultat trouvé')
        .setColor('#FF0000');
      message.channel.send(embedNoResults);
    }
  }else{
    message.channel.send('Dommage t\'as pas la perm')
  }

  }


function searchInFiles(directoryPath, searchString, maxResults) {
  const files = getFilesRecursively(directoryPath);
  const results = [];

  files.forEach((file) => {
    const fileContent = fs.readFileSync(file, 'utf-8');
    const lines = fileContent.split('\n');

    lines.forEach((line, lineNumber) => {
      if (line.toLowerCase().includes(searchString) && results.length < maxResults) {
        results.push(`${lineNumber + 1} - ${line.trim()}`);
      }
    });
  });

  return results;
}

// Reste du code inchangé


function getFilesRecursively(directoryPath) {
  const files = fs.readdirSync(directoryPath);
  let fileList = [];

  files.forEach((file) => {
    const filePath = path.join(directoryPath, file);

    if (fs.statSync(filePath).isDirectory()) {
      fileList = fileList.concat(getFilesRecursively(filePath));
    } else {
      fileList.push(filePath);
    }
  });

  return fileList;
}


function getLineNumber(fileContent, searchString) {
  const lines = fileContent.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchString)) {
      return i + 1; // Ajoute 1 car les numéros de ligne commencent à 1
    }
  }
  return -1; // Retourne -1 si la chaîne n'est pas trouvée
}



// End search Funcs








// Fonctions génériques



// Fonction pour générer une clé
function generateKey(alt) {
  const keyPrefix = alt.substring(0, 4);
  const keySuffix = generateRandomString(8);
  return `${keyPrefix}-${keySuffix}`;
}

// Fonction pour générer plusieurs clés en vrac
function generateBulkKeys(alt) {
  const keys = [];
  for (let i = 0; i < 5; i++) {
    keys.push({
      userId: generateRandomUserId(),
      key: generateKey(alt),
    });
  }
  return keys;
}

// Fonction pour générer un ID utilisateur aléatoire
function generateRandomUserId() {
  return Math.floor(Math.random() * 1000000000).toString();
}

// Fonction pour générer une chaîne aléatoire
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
function getUserIdFromMention(mention) {
  const matches = mention.match(/^<@!?(\d+)>$/);
  return matches ? matches[1] : null;
}

function checkCooldown(userId) {
  const now = Date.now();
  const userCooldown = commandCooldowns[userId] || 0;
  const cooldownDuration = config.allowedUserId === userId ? 0 : 60000; // 1 minute pour les autres, pas de cooldown pour allowedUserId

  return now - userCooldown > cooldownDuration;
}


function updateCooldown(userId) {
  commandCooldowns[userId] = Date.now();
}




client.login(config.token);


const mysql = require('mysql2');
const tls = require('tls');
const fs = require('fs');

class Mysql {

  constructor (host, user, pass, name, port) {
    this.pool = mysql.createPool({
      host: host,
      user: user,
      password: pass,
      database: name,
      port: port,
      ssl: {
        rejectUnauthorized: false,
        ca: fs.readFileSync('/etc/pki/tls/certs/DigiCertGlobalRootCA.crt.pem'),
      },
    });
  }

  select(sql, params = []) {
    return new Promise((resolve, reject) =>{
      this.pool.getConnection(function(err, connection){
        if(err) {
          reject(err);
        }
        connection.query(sql, params, function (error, results, fields) {
          connection.release();
          if(error) {
            reject(error);
          }
          resolve(results);
        });
      });
    });
  };

  update(sql, params = []) {
    return new Promise((resolve, reject) =>{
      this.pool.getConnection(function(err, connection){
        if(err) {
          reject(err);
        }
        connection.query(sql, params, function (error, results, fields) {
          connection.release();
          if(error) {
            reject(error);
          }
          resolve(results);
        });
      });
    });
  };

  insert(sql, params = []) {
    return new Promise((resolve, reject) =>{
      this.pool.getConnection(function(err, connection){
        if(err) {
          reject(err);
        }
        connection.query(sql, params, function (error, results, fields) {
          connection.release();
          if(error) {
            reject(error);
          }
          try {
            resolve(results.insertId);
          } catch (e) {
            console.log(e.message);
            reject(e);
          }
        });
      });
    });
  };

  delete(sql, params = []) {
    return new Promise((resolve, reject) =>{
      this.pool.getConnection(function(err, connection){
        if(err) {
          reject(err);
        }
        connection.query(sql, params, function (error, results, fields) {
          connection.release();
          if(error) {
            reject(error);
          }
          resolve(results);
        });
      });
    });
  };

  exists(sql, params = []) {
    return new Promise((resolve, reject) =>{
      this.pool.getConnection(function(err, connection){
        if(err) {
          reject(err);
        }
        connection.query(sql, params, function (error, results, fields) {
          connection.release();
          if(error) {
            reject(error);
          }
          if(results && Array.isArray(results) && results.length > 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      });
    });
  };

  close(sql) {
    return this.pool.end();
  };

};


module.exports = Mysql;

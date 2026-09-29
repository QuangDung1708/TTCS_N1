const bcrypt = require('bcryptjs');

// Nhờ bcrypt băm mật khẩu thật với độ khó (salt) là 10
const realHash = bcrypt.hashSync('123456aA@', 10);

console.log('Mã băm CHUẨN của 123456aA@ là:');
console.log(realHash);
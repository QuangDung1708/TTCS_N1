const bcrypt = require('bcrypt');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Kiểm tra tài khoản admin@gmail.com đã tồn tại chưa
  const existingUser = await knex('users').where({ email: 'admin@gmail.com' }).first();

  if (!existingUser) {
    const hash = await bcrypt.hash('123456', 10);
    await knex('users').insert({
      email: 'admin@gmail.com',
      password_hash: hash,
      full_name: 'Admin Test'
    });
    console.log('✅ Đã tạo tài khoản test: admin@gmail.com');
  }
};
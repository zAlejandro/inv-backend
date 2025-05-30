const {Pool} = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl:{
        rejectUnauthorized: false,
    },
});

module.exports = pool;



/*const {createClient} = require('@supabase/supabase-js');
require('dotenv').config();

const supaBaseUrl = process.env.SUPABASE_DB_URL;
const supabaseAnonKey = process.env.ANON_KEY;

const supabase = createClient(supaBaseUrl, supabaseAnonKey);

module.exports = supabase;
*/
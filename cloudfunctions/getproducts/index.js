// cloudfunctions/getproducts/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const res = await db.collection('products').get();
    return {
      success: true,
      data: res.data
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: err.message
    };
  }
};
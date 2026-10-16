// cloudfunctions/getallorders/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const res = await db.collection('orders').orderBy('createTime', 'desc').get();
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
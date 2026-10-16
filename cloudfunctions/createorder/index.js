const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function sendWechatWorkNotice(webhookUrl, orderNo, totalPrice, originalTotal, shippingFee, deliveryType, address, remark, items) {
  const itemsText = items.map(item => `  • ${item.name} × ${item.quantity}`).join('\n');
  let addressText = '';
  if (deliveryType === 'delivery' && address) {
    addressText = `收货信息：
  联系人：${address.name}
  电话：${address.phone}
  地址：${address.province}${address.city}${address.district}${address.detail}\n`;
  }
  const content = `🍞 面包脑袋新订单提醒
━━━━━━━━━━━━━━━━
订单号：${orderNo}
商品金额：¥${originalTotal}
运费：¥${shippingFee}
实付金额：¥${totalPrice}
配送方式：${deliveryType === 'pickup' ? '自取' : '配送'}
${addressText}━━━━━━━━━━━━━━━━
商品明细：
${itemsText}
━━━━━━━━━━━━━━━━
备注：${remark || '无'}
请及时处理～`;
  const notice = {
    msgtype: 'text',
    text: { content: content }
  };
  return new Promise((resolve, reject) => {
    const https = require('https');
    const data = JSON.stringify(notice);
    const url = new URL(webhookUrl);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        console.log('企业微信通知发送结果:', rawData);
        resolve(rawData);
      });
    });
    req.on('error', (e) => {
      console.error('企业微信通知发送失败:', e);
      reject(e);
    });
    req.write(data);
    req.end();
  });
}

exports.main = async (event, context) => {
  console.log('收到入参:', event);
  const { items, totalPrice, originalTotal, shippingFee, deliveryType, address, remark } = event;
  const orderNo = 'ORD' + Date.now() + Math.floor(Math.random() * 1000);
  try {
    const result = await db.collection('orders').add({
      data: {
        openid: cloud.getWXContext().OPENID,
        orderNo,
        items,
        totalPrice: Number(totalPrice),
        originalTotal: Number(originalTotal),
        shippingFee: Number(shippingFee),
        deliveryType,
        address: deliveryType === 'delivery' ? address : null,
        remark: remark || '',
        status: '待支付',
        createTime: new Date()
      }
    });

    for (const item of items) {
      await db.collection('products').doc(item.productId).update({
        data: { monthSales: db.command.inc(item.quantity) }
      });
    }

    const webhookUrl = process.env.WECOM_WEBHOOK_URL || ''; // 云函数环境变量，不提交真实凭据
    if (webhookUrl) sendWechatWorkNotice(webhookUrl, orderNo, totalPrice, originalTotal, shippingFee, deliveryType, address, remark, items).catch(err => {
      console.error('发送通知失败:', err);
    });

    return { success: true, orderNo, orderId: result._id };
  } catch (err) {
    console.error('订单创建失败:', err);
    return { success: false, error: err.message };
  }
};
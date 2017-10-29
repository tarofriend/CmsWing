// +----------------------------------------------------------------------
// | CmsWing [ 网站内容管理框架 ]
// +----------------------------------------------------------------------
// | Copyright (c) 2015-2115 http://www.cmswing.com All rights reserved.
// +----------------------------------------------------------------------
// | Author: arterli <arterli@qq.com>
// +----------------------------------------------------------------------
const path = require('path');
const fs = require('fs');
module.exports = class extends think.cmswing.center {
  // async __before() {
  //   await super.__before();
  //   // 判断是否登陆
  //   // await this.weblogin();
  //   if (!this.is_login) {
  //     // 判断浏览客户端
  //     if (this.isMobile) {
  //       // 手机端直接跳转到登录页面
  //       return this.redirect('/center/public/login');
  //     } else {
  //       return this.redirect('/cmswing/error/login');
  //     }
  //   }
  // }
  constructor(ctx) {
    super(ctx);
    this.pdb = this.model('ext_attachment_pic');
    this.fdb = this.model('ext_attachment_file');
  }
  /**
     * index action
     * @return {Promise} []
     */
  indexAction() {
    // auto render template file index_index.html
    return this.display();
  }
  // 上传文件
  async uploadAction() {
    const file = think.extend({}, this.file('file'));
    // console.log(file);
    const filepath = file.path;
    const extname = path.extname(file.name);
    const basename = path.basename(filepath) + extname;
    let data;
    // 强势插入七牛
    if (Number(think.config('ext.attachment.type')) === 2) {
      const qiniu = this.extService('qiniu', 'attachment');
      const uppic = await qiniu.uploadpic(filepath, basename);
      // console.log(uppic);
      // { fieldName: 'file',
      //     originalFilename: '2015-07-06_BaiduPlayerNetSetup_100.exe',
      //     path: '/Users/Arterli/Projects/CmsWing/runtime/upload/EPKRrpZvCsSV73J-7kuDiiEY.exe',
      //     headers:
      //     { 'content-disposition': 'form-data; name="file"; filename="2015-07-06_BaiduPlayerNetSetup_100.exe"',
      //         'content-type': 'application/x-msdownload' },
      //     size: 1292280 }
      if (!think.isEmpty(uppic)) {
        data = {
          create_time: new Date().getTime(),
          name: file.name,
          savename: basename,
          mime: file.type,
          size: file.size,
          type: 2,
          sha1: uppic.hash,
          md5: think.md5(basename)
        };
      }
      // return false;
    } else {
      const uploadPath = think.resource + '/upload/download/' + dateformat('Y-m-d', new Date().getTime());
      think.mkdir(uploadPath);
      fs.renameSync(filepath, uploadPath + '/' + basename);
      file.path = uploadPath + '/' + basename;
      if (think.isFile(file.path)) {
        data = {
          savepath: '/upload/download/' + dateformat('Y-m-d', new Date().getTime()) + '/',
          create_time: new Date().getTime(),
          name: file.name,
          savename: basename,
          mime: file.type,
          size: file.size,
          md5: think.md5(basename)
        };
      }
    }
    // console.log(data);
    const res = await this.fdb.add(data);
    return this.json({id: res, size: file.size});
  }

  // 上传图片
  async uploadpicAction() {
    const type = this.get('type');
    let name = 'file';
    let att = {};
    if (!think.isEmpty(type)) {
      const atts = await this.extModel('attachment').where({dis: type, type: 0}).find();
      att = think.extend(att, atts);
    }
    if (!think.isEmpty(att) && !think.isEmpty(att.name)) {
      name = att.name;
    }

    const file = think.extend({}, this.file(name));
    const filepath = file.path;
    const extname = path.extname(file.name);

    const basename = path.basename(filepath) + extname;

    const ret = {'status': 1, 'info': '上传成功', 'data': ''};
    let data;
    // 加入七牛接口
    if (Number(this.config('ext.attachment.type')) === 2) {
      const qiniu = this.extService('qiniu', 'attachment');
      const uppic = await qiniu.uploadpic(filepath, basename);
      if (!think.isEmpty(uppic)) {
        data = {
          create_time: new Date().getTime(),
          status: 1,
          type: 2,
          sha1: uppic.hash,
          path: uppic.key

        };
      }
    } else {
      const uploadPath = think.resource + '/upload/picture/' + dateformat('Y-m-d', new Date().getTime());
      think.mkdir(uploadPath);
      if (think.isFile(filepath)) {
        fs.renameSync(filepath, uploadPath + '/' + basename);
      } else {
        console.log('文件不存在！');
      }
      file.path = uploadPath + '/' + basename;
      if (think.isFile(file.path)) {
        data = {
          path: '/upload/picture/' + dateformat('Y-m-d', new Date().getTime()) + '/' + basename,
          create_time: new Date().getTime(),
          status: 1

        };
      } else {
        console.log('not exist');
      }
    }
    const res = await this.pdb.add(data);
    const r = {id: res, url: await get_pic(res), name: (file.name).trim()};
    let rr = {};
    if (!think.isEmpty(att) && !think.isEmpty(att.rule)) {
      const match = att.rule.match(/\${(\S+?)\}/g);
      console.log(match);
      const replace = [];
      for (let val of match) {
        val = val.replace(/(^\${)|(\}$)/g, '');
        replace.push(r[val]);
      }
      console.log(replace);
      rr = str_replace(match, replace, att.rule);
      console.log(rr);
      if (att.rule.indexOf('{') === 0) {
        rr = JSON.parse(rr);
      }
    }
    return think.isEmpty(rr) ? this.json(res) : this.json(rr);
  }

  // 获取七牛token
  async getqiniuuptokenAction() {
    const qiniu = this.extService('qiniu', 'attachment');
    const key = think.uuid();
    const uptoken = await qiniu.uploadpic(null, key, true);
    this.json({
      'uptoken': uptoken
    });
  }
  // 添加
  async qiniuaddAction() {
    const post = this.post();
    const data = {
      create_time: new Date().getTime(),
      name: post.key,
      savename: post.key,
      mime: post.mime,
      size: post.size,
      type: 2,
      sha1: post.hash,
      md5: think.md5(post.id)
    };
    // console.log(data);
    const res = await this.model('ext_attachment_file').add(data);
    return this.json(res);
  }
  // 删除七牛资源
  async delqiniufileAction() {
    const id = this.get('id');
    const file = await this.model('file').find(id);
    const qiniu = this.extService('qiniu', 'attachment');
    const res = await qiniu.remove(file.savename);
    if (res) {
      this.model('file').where({id: id}).delete();
      return this.success({name: '删除文件成功!'});
    } else {
      return this.fail('删除文件失败!');
    }
  }
};

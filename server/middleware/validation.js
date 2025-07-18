const Joi = require('joi');

// 用戶註冊驗證
const validateUser = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .messages({
        'string.alphanum': '用戶名只能包含字母和數字',
        'string.min': '用戶名至少需要 3 個字符',
        'string.max': '用戶名不能超過 30 個字符',
        'any.required': '用戶名是必填項'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': '請提供有效的電子郵件地址',
        'any.required': '電子郵件是必填項'
      }),
    
    password: Joi.string()
      .min(6)
      .required()
      .messages({
        'string.min': '密碼至少需要 6 個字符',
        'any.required': '密碼是必填項'
      }),
    
    firstName: Joi.string()
      .max(50)
      .allow('')
      .messages({
        'string.max': '名字不能超過 50 個字符'
      }),
    
    lastName: Joi.string()
      .max(50)
      .allow('')
      .messages({
        'string.max': '姓氏不能超過 50 個字符'
      })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: '驗證失敗',
      errors: error.details.map(detail => detail.message)
    });
  }

  next();
};

// 用戶登入驗證
const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string()
      .required()
      .messages({
        'any.required': '電子郵件或用戶名是必填項'
      }),
    
    password: Joi.string()
      .required()
      .messages({
        'any.required': '密碼是必填項'
      })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: '驗證失敗',
      errors: error.details.map(detail => detail.message)
    });
  }

  next();
};

// 動作會話驗證
const validateMotionSession = (req, res, next) => {
  const schema = Joi.object({
    title: Joi.string()
      .min(1)
      .max(200)
      .required()
      .messages({
        'string.min': '標題不能為空',
        'string.max': '標題不能超過 200 個字符',
        'any.required': '標題是必填項'
      }),
    
    description: Joi.string()
      .max(1000)
      .allow('')
      .messages({
        'string.max': '描述不能超過 1000 個字符'
      }),
    
    tags: Joi.string()
      .allow('')
      .messages({}),
    
    isPublic: Joi.string()
      .valid('true', 'false')
      .messages({
        'any.only': 'isPublic 必須是 true 或 false'
      }),
    
    videoDuration: Joi.number()
      .min(0)
      .messages({
        'number.min': '影片時長不能為負數'
      }),
    
    fps: Joi.number()
      .min(1)
      .max(120)
      .messages({
        'number.min': 'FPS 至少為 1',
        'number.max': 'FPS 不能超過 120'
      }),
    
    width: Joi.number()
      .min(1)
      .messages({
        'number.min': '寬度至少為 1'
      }),
    
    height: Joi.number()
      .min(1)
      .messages({
        'number.min': '高度至少為 1'
      }),
    
    platform: Joi.string()
      .allow('')
      .messages({}),
    
    camera: Joi.string()
      .allow('')
      .messages({})
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: '驗證失敗',
      errors: error.details.map(detail => detail.message)
    });
  }

  next();
};

// 姿勢數據驗證
const validatePoseData = (poseData) => {
  const frameSchema = Joi.object({
    timestamp: Joi.number()
      .required()
      .messages({
        'any.required': '時間戳是必填項'
      }),
    
    frameTime: Joi.number()
      .min(0)
      .required()
      .messages({
        'number.min': '幀時間不能為負數',
        'any.required': '幀時間是必填項'
      }),
    
    frameNumber: Joi.number()
      .integer()
      .min(0)
      .required()
      .messages({
        'number.integer': '幀號必須是整數',
        'number.min': '幀號不能為負數',
        'any.required': '幀號是必填項'
      }),
    landmarks3D: Joi.array()
      .length(17)
      .items(
        Joi.object({
          x: Joi.number().min(0).max(1).required(),
          y: Joi.number().min(0).max(1).required(),
          z: Joi.number().required(),
          visibility: Joi.number().min(0).max(1).required()
        })
      )
      .required()
      .messages({
        'array.length': '必須包含 17 個姿勢關鍵點',
        'any.required': '姿勢關鍵點是必填項'
      }),
    landmarks2D: Joi.array()
      .length(17)
      .items(
        Joi.object({
          x: Joi.number().min(0).max(1).required(),
          y: Joi.number().min(0).max(1).required(),
          z: Joi.number().required(),
          visibility: Joi.number().min(0).max(1).required()
        })
      )
      .required()
      .messages({
        'array.length': '必須包含 17 個姿勢關鍵點',
        'any.required': '姿勢關鍵點是必填項'
      }),
    
    confidenceValues: Joi.array()
      .items(Joi.number().min(0).max(1))
      .messages({})
  });

  const schema = Joi.array()
    .min(1)
    .items(frameSchema)
    .messages({
      'array.min': '至少需要一個幀數據'
    });

  return schema.validate(poseData);
};

module.exports = {
  validateUser,
  validateLogin,
  validateMotionSession,
  validatePoseData
};

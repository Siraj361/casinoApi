// Controller/languageController.js

const db = require("../../Model/index.js");
const Language = db.language;

exports.createLanguage = async (req, res) => {
  try {
    const { code, name } = req.body;

    const image = req.file ? req.file.path : null;

    const language = await Language.create({
      code,
      name,
      image,
    });

    return res.status(201).json({
      message: "Language created successfully",
      data: language,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


exports.getLanguages = async (req, res) => {
  try {
    const languages = await Language.findAll({
      order: [["id", "DESC"]],
    });

    return res.status(200).json(languages);
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


exports.updateLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, is_active } = req.body;

    const language = await Language.findByPk(id);

    if (!language) {
      return res.status(404).json({
        message: "Language not found",
      });
    }

    let image = language.image;

    if (req.file) {
      image = req.file.path;
    }

    await language.update({
      code,
      name,
      image,
      is_active,
    });

    return res.status(200).json({
      message: "Language updated successfully",
      data: language,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};


exports.deleteLanguage = async (req, res) => {
  try {
    const { id } = req.params;

    const language = await Language.findByPk(id);

    if (!language) {
      return res.status(404).json({
        message: "Language not found",
      });
    }

    await language.destroy();

    return res.status(200).json({
      message: "Language deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
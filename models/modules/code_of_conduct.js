const { Sequelize, DataTypes, QueryTypes } = require("sequelize");
const { DB_CLIENT } = require("../../db");
const { User, Role, Company, Mandate, UserAttribute } = require("./onboarding");
const { RatingProcess, FinancialYear } = require("./rating-model");

const RelationshipType = DB_CLIENT.define(
  "relationship",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      default: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
  },
  {
    tableName: "relationship_types",
    indexes: [
      {
        unique: true,
        fields: ["uuid"],
      },
      {
        unique: true,
        fields: ["name"],
      },
    ],
    underscored: true,
  }
);

const FormType = DB_CLIENT.define(
  "form_type",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    form_number: {
      type: DataTypes.INTEGER,
      allowNull: false,
      notEmpty: true,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      default: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
  },
  {
    tableName: "form_types",
    indexes: [
      {
        unique: true,
        fields: ["uuid"],
      },
      {
        unique: true,
        fields: ["name"],
      },
    ],
    underscored: true,
  }
);

const FormMetadata = DB_CLIENT.define(
  "form_metadata",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    last_edited: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
    signature: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    form_date: {
      type: DataTypes.DATE,
      allowNull: false,
      default: Sequelize.NOW,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
    user_name: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    telephone: {
      type: DataTypes.INTEGER,
      allowNull: false,
      notEmpty: true,
    },
    branch: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      default: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
  },
  {
    tableName: "form_metadata",
    indexes: [
      {
        unique: true,
        fields: ["uuid"],
      },
    ],
    underscored: true,
  }
);
const Relative = DB_CLIENT.define(
  "relative",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      default: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
  },
  {
    tableName: "relatives",
    indexes: [
      {
        unique: true,
        fields: ["uuid"],
      },
    ],
    underscored: true,
  }
);

const FormInvestmentData = DB_CLIENT.define(
  "investment",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    company_name: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    face_value: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    num_name_securities_acquired: {
      type: DataTypes.STRING,
    },
    consideration_paid: {
      type: DataTypes.INTEGER,
    },
    num_name_securities_disposed: {
      type: DataTypes.STRING,
    },
    consideration_recieved: {
      type: DataTypes.INTEGER,
    },
    folio: {
      type: DataTypes.INTEGER,
    },
    investment_approval_date: {
      type: DataTypes.INTEGER,
    },
    num_name_securities_held: {
      type: DataTypes.STRING,
    },
    num_name_securities_held_fny_start: {
      type: DataTypes.STRING,
    },
    num_name_securities_held_fny_end: {
      type: DataTypes.STRING,
    },
    num_name_securities_to_be_dealt: {
      type: DataTypes.STRING,
    },
    nature_of_transaction: {
      type: DataTypes.STRING,
    },
    acquisition_date: {
      type: DataTypes.DATE,
    },
    reason_for_min_period_waiver: {
      type: DataTypes.DATE,
    },
    num_name_securities_to_be_disposed: {
      type: DataTypes.STRING,
    },

    approval_status: {
      type: DataTypes.BOOLEAN,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      default: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
  },
  {
    tableName: "investments",
    indexes: [
      {
        unique: true,
        fields: ["uuid"],
      },
    ],
    underscored: true,
  }
);

const FormWitnesses = DB_CLIENT.define(
  "form_witnesses",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    uuid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    designation: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    telephone: {
      type: DataTypes.STRING,
      allowNull: false,
      notEmpty: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      default: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
      default: Sequelize.NOW,
    },
  },
  {
    tableName: "form_witnesses",
    indexes: [
      {
        unique: true,
        fields: ["uuid"],
      },
    ],
    underscored: true,
  }
);

FormWitnesses.belongsTo(FormMetadata, {
  foreignKey: "form_id",
  as: "coc_form_id",
});
FormWitnesses.belongsTo(User, {
  foreignKey: "created_by",
  as: "created_by_user",
});
FormWitnesses.belongsTo(User, {
  foreignKey: "updated_by",
  as: "updated_by_user",
});

FormMetadata.belongsTo(UserAttribute, {
  foreignKey: "user_id",
  as: "user_data",
});
FormMetadata.belongsTo(User, {
  foreignKey: "approved_by",
  as: "approved_by_user",
});
FormMetadata.belongsTo(FormType, {
  foreignKey: "form_type_id",
  as: "coc_form_type",
});
FormMetadata.belongsTo(FinancialYear, {
  foreignKey: "financial_year",
  as: "coc_financial_year",
});

FormMetadata.belongsTo(User, {
  foreignKey: "created_by",
  as: "created_by_user",
});
FormMetadata.belongsTo(User, {
  foreignKey: "updated_by",
  as: "updated_by_user",
});

Relative.belongsTo(FormMetadata, { foreignKey: "form_id", as: "coc_form" });
Relative.belongsTo(User, { foreignKey: "created_by", as: "created_by_user" });
Relative.belongsTo(User, { foreignKey: "updated_by", as: "updated_by_user" });
Relative.belongsTo(RelationshipType, {
  foreignKey: "relationship_id",
  as: "coc_relationship",
});

FormInvestmentData.belongsTo(Relative, {
  foreignKey: "relative_id",
  as: "coc_relative",
});
FormInvestmentData.belongsTo(FormMetadata, {
  foreignKey: "form_id",
  as: "coc_form",
});

FormInvestmentData.belongsTo(User, {
  foreignKey: "created_by",
  as: "created_by_user",
});
FormInvestmentData.belongsTo(User, {
  foreignKey: "updated_by",
  as: "updated_by_user",
});

const COC_DB_INSTANCE = DB_CLIENT;

module.exports = {
  COC_DB_INSTANCE,
  Relative,
  FormInvestmentData,
  FormMetadata,
  FormType,
  FormWitnesses,
  RelationshipType,
};

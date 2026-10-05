import { Sequelize, DataTypes } from 'sequelize';

const url = process.env.DATABASE_URL || 'mysql://root@localhost:3306/dailylog';
export const sequelize = new Sequelize(url, { logging: false });

export const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
  },
  { tableName: 'users' }
);

export const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

export const Task = sequelize.define(
  'Task',
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    logDate: { type: DataTypes.DATE, allowNull: false },
    startTime: { type: DataTypes.STRING(5), allowNull: true },
    endTime: { type: DataTypes.STRING(5), allowNull: true },
    status: { type: DataTypes.ENUM(...VALID_STATUSES), allowNull: false, defaultValue: 'TODO' },
  },
  { tableName: 'tasks' }
);

Task.belongsTo(User, { foreignKey: { name: 'userId', allowNull: false }, onDelete: 'CASCADE' });
User.hasMany(Task, { foreignKey: 'userId' });

export async function syncDb() {
  await sequelize.sync();
}

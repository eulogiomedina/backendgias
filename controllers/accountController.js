const Account = require('../models/Account');

// Obtener todas las cuentas
exports.getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account.find();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener cuentas', error });
  }
};

// Eliminar una cuenta
exports.deleteAccount = async (req, res) => {
  try {
    await Account.findByIdAndDelete(req.params.id);
    res.json({ message: 'Cuenta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar cuenta', error });
  }
};

// Actualizar información de la cuenta
exports.updateAccount = async (req, res) => {
  try {
    const { nombre, apellidos, correo, telefono, role } = req.body;  // Corregido

    const updatedAccount = await Account.findByIdAndUpdate(
      req.params.id,
      { nombre, apellidos, correo, telefono, role },  // Corregido
      { new: true }
    );

    res.json(updatedAccount);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar cuenta', error });
  }
};

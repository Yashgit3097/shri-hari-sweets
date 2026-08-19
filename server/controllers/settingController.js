import Setting from '../models/Setting.js';

// @desc    Get setting by key
// @route   GET /api/settings/:key
// @access  Public
export const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    let setting = await Setting.findOne({ key });
    
    // If not found, return empty value instead of error
    if (!setting) {
      return res.status(200).json({ key, value: '' });
    }
    
    res.status(200).json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error fetching setting' });
  }
};

// @desc    Create or update setting
// @route   PUT /api/settings/:key
// @access  Public
export const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined) {
      return res.status(400).json({ message: 'Value is required' });
    }

    let setting = await Setting.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );

    // Broadcast the update via socket.io if initialized
    const io = req.app.get('io');
    if (io) {
      io.emit('setting-updated', { key, value });
    }

    res.status(200).json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error updating setting' });
  }
};

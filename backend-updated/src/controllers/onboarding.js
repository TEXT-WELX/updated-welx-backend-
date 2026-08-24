const userRepository = require('../repositories/userRepository');

const ALLOWED_FIELDS = [
  'currentLevel',
  'primaryGoal',
  'timeCommitment',
  'education',
  'fieldOfStudy',
  'workExperience',
  'targetRole',
  'skillsToImprove',
  'budget',
  'startDate',
  'completionTimeline',
];

function sanitizeOnboardingData(input) {
  return ALLOWED_FIELDS.reduce((result, key) => {
    if (input[key] !== undefined) result[key] = input[key];
    return result;
  }, {});
}

exports.save = async (req, res) => {
  try {
    const formData = sanitizeOnboardingData(req.body.onboardingData || {});
    if (!formData.targetRole || !Array.isArray(formData.skillsToImprove) || !formData.skillsToImprove.length) {
      return res.status(400).json({ message: 'Target role and at least one skill are required' });
    }
    if (!formData.startDate || !formData.completionTimeline) {
      return res.status(400).json({ message: 'Start date and completion timeline are required' });
    }
    const user = await userRepository.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'employer') return res.status(403).json({ message: 'Employer accounts do not use student onboarding' });
    const updated = await userRepository.updateById(req.user._id, {
      onboardingData: formData,
      onboardingComplete: true,
    });
    res.json({
      ok: true,
      user: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        company: updated.company || '',
        onboardingComplete: true,
        onboardingData: updated.onboardingData,
      },
    });
  } catch (err) {
    console.error('Error saving onboarding data:', err);
    res.status(500).json({ message: err.message });
  }
};

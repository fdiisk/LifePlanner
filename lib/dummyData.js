// ============================================
// DUMMY DATA MODULE - SAFE TO DELETE
// ============================================
// This file contains sample data for demonstration.
// To remove all dummy data, simply delete this file
// and remove the import/calls in the API endpoints.
// ============================================

export const dummyCategories = [
  { name: 'Health', icon: '💪', color: '#22c55e', display_order: 1 },
  { name: 'Career', icon: '💼', color: '#3b82f6', display_order: 2 },
  { name: 'Relationships', icon: '❤️', color: '#ec4899', display_order: 3 },
  { name: 'Hobbies', icon: '🎨', color: '#f59e0b', display_order: 4 }
];

export const dummyGoals = [
  // Health - High Level
  {
    category: 'Health',
    parent: null,
    title: 'Transform body composition by Dec 31, 2026',
    description: 'Achieve optimal health through muscle gain and fat loss',
    goal_type: 'high_level',
    timeframe_start: '2025-01-01',
    timeframe_end: '2026-12-31',
    target_value: null,
    target_unit: null,
    is_smart: true,
    smart_details: {
      specific: 'Gain 2kg lean muscle and lose 5kg fat',
      measurable: 'Body composition scan every 3 months',
      achievable: 'Based on 0.25kg muscle gain per month',
      relevant: 'Improves health, confidence, and longevity',
      time_bound: 'By December 31, 2026'
    }
  },
  // Health - Yearly (child of above)
  {
    category: 'Health',
    parent: 'Transform body composition by Dec 31, 2026',
    title: 'Gain 2kg muscle mass in 2025',
    description: 'Build lean muscle through progressive overload',
    goal_type: 'yearly',
    timeframe_start: '2025-01-01',
    timeframe_end: '2025-12-31',
    target_value: 2,
    target_unit: 'kg',
    calculation_formula: 'target_surplus = (2000g * 7700cal/kg) / 365 days = +42 cal/day surplus',
    linked_health_metrics: { protein: 'min 2g/kg bodyweight', workouts: '4-5 sessions/week' }
  },
  {
    category: 'Health',
    parent: 'Transform body composition by Dec 31, 2026',
    title: 'Lose 5kg body fat in 2025',
    description: 'Reduce body fat through calorie deficit',
    goal_type: 'yearly',
    timeframe_start: '2025-01-01',
    timeframe_end: '2025-12-31',
    target_value: 5,
    target_unit: 'kg',
    calculation_formula: 'target_deficit = (5000g * 7700cal/kg) / 365 days = -105 cal/day deficit',
    linked_health_metrics: { calories: 'daily deficit', cardio: '3 sessions/week' }
  },
  // Health - Quarterly
  {
    category: 'Health',
    parent: 'Gain 2kg muscle mass in 2025',
    title: 'Q1 2025: Gain 0.5kg muscle',
    description: 'Focus on compound movements and progressive overload',
    goal_type: 'quarterly',
    timeframe_start: '2025-01-01',
    timeframe_end: '2025-03-31',
    target_value: 0.5,
    target_unit: 'kg'
  },
  // Career
  {
    category: 'Career',
    parent: null,
    title: 'Become senior developer by Q4 2025',
    description: 'Advance career through skill development and leadership',
    goal_type: 'yearly',
    timeframe_start: '2025-01-01',
    timeframe_end: '2025-12-31',
    target_value: null,
    target_unit: null,
    is_smart: true,
    smart_details: {
      specific: 'Lead 2 major projects, mentor 3 juniors, complete advanced certifications',
      measurable: 'Performance reviews and completed projects',
      achievable: 'Based on current trajectory and manager support',
      relevant: 'Career growth and salary increase',
      time_bound: 'Promotion decision in Q4 2025'
    }
  },
  // Relationships
  {
    category: 'Relationships',
    parent: null,
    title: 'Strengthen family bonds in 2025',
    description: 'Spend quality time with family regularly',
    goal_type: 'yearly',
    timeframe_start: '2025-01-01',
    timeframe_end: '2025-12-31',
    target_value: 52,
    target_unit: 'family dinners'
  }
];

export const dummyHabits = [
  // Health habits
  {
    category: 'Health',
    goal: 'Q1 2025: Gain 0.5kg muscle',
    title: 'Gym workout (strength training)',
    description: 'Complete full-body or split workout',
    target_frequency: 'daily',
    target_value: 4,
    target_unit: 'sessions per week',
    is_health_linked: true,
    health_data_type: 'workout'
  },
  {
    category: 'Health',
    goal: 'Q1 2025: Gain 0.5kg muscle',
    title: 'Protein intake',
    description: 'Meet daily protein target',
    target_frequency: 'daily',
    target_value: 160,
    target_unit: 'grams',
    is_health_linked: true,
    health_data_type: 'food'
  },
  {
    category: 'Health',
    goal: 'Lose 5kg body fat in 2025',
    title: 'Stay within calorie target',
    description: 'Maintain calorie deficit',
    target_frequency: 'daily',
    target_value: 2200,
    target_unit: 'calories',
    is_health_linked: true,
    health_data_type: 'food'
  },
  {
    category: 'Health',
    goal: null,
    title: 'Hydration',
    description: 'Drink adequate water',
    target_frequency: 'daily',
    target_value: 3,
    target_unit: 'liters',
    is_health_linked: true,
    health_data_type: 'water'
  },
  {
    category: 'Health',
    goal: 'Lose 5kg body fat in 2025',
    title: 'Daily steps',
    description: 'Hit step goal',
    target_frequency: 'daily',
    target_value: 10000,
    target_unit: 'steps',
    is_health_linked: true,
    health_data_type: 'steps'
  },
  // Career habits
  {
    category: 'Career',
    goal: 'Become senior developer by Q4 2025',
    title: 'Study/Learning',
    description: 'Dedicated learning time',
    target_frequency: 'daily',
    target_value: 1,
    target_unit: 'hour',
    is_health_linked: false
  },
  {
    category: 'Career',
    goal: 'Become senior developer by Q4 2025',
    title: 'Code review/mentoring',
    description: 'Help junior developers',
    target_frequency: 'weekly',
    target_value: 3,
    target_unit: 'sessions',
    is_health_linked: false
  },
  // Relationships
  {
    category: 'Relationships',
    goal: 'Strengthen family bonds in 2025',
    title: 'Family time',
    description: 'Quality time with family',
    target_frequency: 'weekly',
    target_value: 1,
    target_unit: 'dinner',
    is_health_linked: false
  },
  {
    category: 'Relationships',
    goal: null,
    title: 'Call parents',
    description: 'Regular check-in with parents',
    target_frequency: 'weekly',
    target_value: 2,
    target_unit: 'calls',
    is_health_linked: false
  },
  // Hobbies
  {
    category: 'Hobbies',
    goal: null,
    title: 'Reading',
    description: 'Read for enjoyment and growth',
    target_frequency: 'daily',
    target_value: 30,
    target_unit: 'minutes',
    is_health_linked: false
  }
];

export const dummyDailyTracking = [
  // Last 7 days of sample tracking
  // Format: { habit: 'habit_title', date: 'YYYY-MM-DD', rank: 1-3, notes: '' }
];

// Generate last 7 days of dummy tracking data
const today = new Date();
for (let i = 6; i >= 0; i--) {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  const dateStr = date.toISOString().split('T')[0];

  // Simulate realistic patterns
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  dummyDailyTracking.push(
    // Gym workout - 4x per week, mostly green on workout days
    { habit: 'Gym workout (strength training)', date: dateStr, rank: [1,2,3,4,5].includes(dayOfWeek) ? 3 : 1, notes: '', auto_populated: true },

    // Protein - mostly green with occasional yellow
    { habit: 'Protein intake', date: dateStr, rank: i % 4 === 0 ? 2 : 3, notes: '', auto_populated: true },

    // Calories - mix of ranks
    { habit: 'Stay within calorie target', date: dateStr, rank: isWeekend ? 2 : 3, notes: '', auto_populated: true },

    // Hydration - consistently good
    { habit: 'Hydration', date: dateStr, rank: 3, notes: '', auto_populated: true },

    // Steps - higher on gym days
    { habit: 'Daily steps', date: dateStr, rank: [1,2,3,4,5].includes(dayOfWeek) ? 3 : 2, notes: '', auto_populated: true },

    // Study - mostly consistent
    { habit: 'Study/Learning', date: dateStr, rank: i % 3 === 0 ? 2 : 3, notes: '', auto_populated: false },

    // Reading - varies
    { habit: 'Reading', date: dateStr, rank: i % 2 === 0 ? 3 : 2, notes: '', auto_populated: false }
  );
}

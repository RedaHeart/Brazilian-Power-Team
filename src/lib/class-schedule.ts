import { supabase } from '@/lib/supabase';

type DateRange = {
  from: Date;
  to: Date;
};

type ClassTemplate = {
  id: string;
  name: string;
  weekday: number;
  start_time: string;
  end_time: string;
  allowed_groups: string[];
  min_belt: string | null;
  active: boolean;
};

type ExistingClass = {
  title: string;
  starts_at: string;
  ends_at: string | null;
  allowed_groups: string[] | null;
  min_belt: string | null;
};

const sameTextArray = (left: string[] | null, right: string[]) => {
  const normalizedLeft = [...(left || [])].sort();
  const normalizedRight = [...right].sort();

  if (normalizedLeft.length !== normalizedRight.length) return false;

  return normalizedLeft.every((item, index) => item === normalizedRight[index]);
};

const sameInstant = (left: string, right: string | null) => {
  if (!right) return false;
  return new Date(left).getTime() === new Date(right).getTime();
};

const matchesTemplateClass = (existingClass: ExistingClass, candidate: ExistingClass) =>
  existingClass.title === candidate.title &&
  sameInstant(existingClass.starts_at, candidate.starts_at) &&
  sameInstant(existingClass.ends_at || '', candidate.ends_at) &&
  (existingClass.min_belt || null) === (candidate.min_belt || null) &&
  sameTextArray(existingClass.allowed_groups, candidate.allowed_groups || []);

const buildClassDateTime = (date: Date, timeValue: string) => {
  const [hours, minutes] = timeValue.split(':').map(Number);
  const classDate = new Date(date);
  classDate.setHours(hours, minutes, 0, 0);
  return classDate;
};

export const ensureClassesForRange = async ({ from, to }: DateRange) => {
  const [{ data: templates, error: templateError }, { data: existingClasses, error: classError }] = await Promise.all([
    supabase
      .from('class_templates')
      .select('id, name, weekday, start_time, end_time, allowed_groups, min_belt, active')
      .eq('active', true)
      .order('weekday', { ascending: true }),
    supabase
      .from('classes')
      .select('title, starts_at, ends_at, allowed_groups, min_belt')
      .gte('starts_at', from.toISOString())
      .lte('starts_at', to.toISOString()),
  ]);

  if (templateError) throw templateError;
  if (classError) throw classError;

  const activeTemplates = (templates || []) as ClassTemplate[];
  const currentClasses = (existingClasses || []) as ExistingClass[];
  const classesToInsert: Array<ExistingClass & { type: string; template_id: string }> = [];

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= to) {
    const templateWeekday = ((cursor.getDay() + 6) % 7) + 1;

    activeTemplates
      .filter((template) => template.weekday === templateWeekday)
      .forEach((template) => {
        const startsAt = buildClassDateTime(cursor, template.start_time);
        const endsAt = buildClassDateTime(cursor, template.end_time);
        const candidate = {
          title: template.name,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          allowed_groups: template.allowed_groups || [],
          min_belt: template.min_belt,
        };

        const alreadyExists =
          currentClasses.some((existingClass) => matchesTemplateClass(existingClass, candidate)) ||
          classesToInsert.some((existingClass) => matchesTemplateClass(existingClass, candidate));

        if (!alreadyExists) {
          classesToInsert.push({
            ...candidate,
            type: 'GI',
            template_id: template.id,
          });
        }
      });

    cursor.setDate(cursor.getDate() + 1);
  }

  if (classesToInsert.length === 0) return 0;

  const { error: insertError } = await supabase.from('classes').insert(classesToInsert);
  if (insertError) throw insertError;

  return classesToInsert.length;
};

export const buildMonthRange = (year: number, monthIndex: number) => ({
  from: new Date(year, monthIndex, 1),
  to: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
});

export const buildWeekRange = (offset: number) => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { from: monday, to: sunday };
};

export const buildCurrentWeekRange = () => buildWeekRange(0);

export const buildCurrentMonthRange = () => {
  const now = new Date();
  return buildMonthRange(now.getFullYear(), now.getMonth());
};

export const buildCurrentYearRange = () => {
  const now = new Date();
  return {
    from: new Date(now.getFullYear(), 0, 1),
    to: new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999),
  };
};

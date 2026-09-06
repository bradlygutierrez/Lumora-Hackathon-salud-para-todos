import {
  render,
  within,
} from '@testing-library/react-native';

import {
  AppointmentCalendar,
} from '@/features/appointments/components/AppointmentCalendar';
import {
  TimeSlotGrid,
} from '@/features/appointments/components/TimeSlotGrid';

jest.mock(
  '@expo/vector-icons',
  () => ({
    Ionicons: () => null,
  }),
);

describe(
  'appointment date and time selection',
  () => {
    it(
      'keeps every calendar week in a seven-day row ending on Sunday',
      async () => {
        const screen =
          await render(
            <AppointmentCalendar
              selectedDate="2026-09-01"
              onSelectDate={
                jest.fn()
              }
            />,
          );

        const weeks =
          screen.getAllByTestId(
            'appointment-calendar-week',
          );

        expect(weeks).toHaveLength(6);

        const firstWeek =
          within(
            weeks[0],
          ).getAllByRole(
            'button',
          );

        expect(firstWeek).toHaveLength(7);
        expect(
          firstWeek[6].props
            .accessibilityLabel,
        ).toBe(
          'Seleccionar 2026-09-06',
        );
      },
    );

    it(
      'disables a past slot even if the API marked it available',
      async () => {
        const screen =
          await render(
            <TimeSlotGrid
              slots={[
                {
                  inicio:
                    '2000-01-01T09:00:00Z',
                  fin:
                    '2000-01-01T09:45:00Z',
                  disponible: true,
                },
                {
                  inicio:
                    '2999-01-01T09:00:00Z',
                  fin:
                    '2999-01-01T09:45:00Z',
                  disponible: true,
                },
              ]}
              selectedStart={
                null
              }
              onSelect={
                jest.fn()
              }
            />,
          );

        const slots =
          screen.getAllByRole(
            'button',
          );

        expect(
          slots[0].props
            .accessibilityState
            .disabled,
        ).toBe(true);
        expect(
          slots[1].props
            .accessibilityState
            .disabled,
        ).toBe(false);
      },
    );
  },
);

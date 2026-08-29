import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Pressable,
  Text,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import {
  dateKeyToDate,
  isPastDateKey,
  toDateKey,
} from '@/features/appointments/utils/appointments';

const WEEKDAYS = [
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
  'Dom',
];

type CalendarCell = {
  key: string;
  day: number;
  inMonth: boolean;
};

function monthCells(
  anchor: Date,
): CalendarCell[] {
  const year =
    anchor.getFullYear();
  const month =
    anchor.getMonth();

  const first =
    new Date(
      year,
      month,
      1,
      12,
    );

  // JS: domingo=0. UI: lunes=0.
  const leading =
    (first.getDay() + 6) %
    7;

  const start =
    new Date(
      year,
      month,
      1 - leading,
      12,
    );

  return Array.from(
    {
      length: 42,
    },
    (
      _,
      index,
    ) => {
      const date =
        new Date(
          start,
        );

      date.setDate(
        start.getDate() +
          index,
      );

      return {
        key:
          toDateKey(
            date,
          ),
        day:
          date.getDate(),
        inMonth:
          date.getMonth() ===
          month,
      };
    },
  );
}

export function AppointmentCalendar({
  selectedDate,
  onSelectDate,
}: {
  selectedDate: string;
  onSelectDate: (
    date: string,
  ) => void;
}) {
  const [
    month,
    setMonth,
  ] =
    useState(
      () =>
        dateKeyToDate(
          selectedDate,
        ),
    );

  useEffect(
    () => {
      setMonth(
        dateKeyToDate(
          selectedDate,
        ),
      );
    },
    [
      selectedDate,
    ],
  );

  const cells =
    useMemo(
      () =>
        monthCells(
          month,
        ),
      [
        month,
      ],
    );

  const monthLabel =
    new Intl.DateTimeFormat(
      'es-NI',
      {
        month:
          'long',
        year:
          'numeric',
      },
    ).format(
      month,
    );

  const moveMonth = (
    delta: number,
  ) => {
    setMonth(
      (
        current,
      ) =>
        new Date(
          current.getFullYear(),
          current.getMonth() +
            delta,
          1,
          12,
        ),
    );
  };

  return (
    <View className="rounded-2xl border border-coal-500/10 bg-white p-4">
      <View className="mb-4 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
          onPress={() =>
            moveMonth(
              -1,
            )
          }
          className="h-9 w-9 items-center justify-center rounded-full active:bg-bone-500"
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color="#39434A"
          />
        </Pressable>

        <Text className="text-base font-semibold capitalize text-coal-900">
          {monthLabel}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
          onPress={() =>
            moveMonth(
              1,
            )
          }
          className="h-9 w-9 items-center justify-center rounded-full active:bg-bone-500"
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#39434A"
          />
        </Pressable>
      </View>

      <View className="flex-row">
        {WEEKDAYS.map(
          (
            weekday,
          ) => (
            <View
              key={
                weekday
              }
              className="flex-1 items-center py-2"
            >
              <Text className="text-[11px] font-medium text-coal-500">
                {weekday}
              </Text>
            </View>
          ),
        )}
      </View>

      <View className="flex-row flex-wrap">
        {cells.map(
          (
            cell,
          ) => {
            const selected =
              cell.key ===
              selectedDate;

            const disabled =
              !cell.inMonth ||
              isPastDateKey(
                cell.key,
              );

            return (
              <View
                key={
                  cell.key
                }
                className="w-[14.2857%] items-center py-1"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Seleccionar ${cell.key}`}
                  accessibilityState={{
                    selected,
                    disabled,
                  }}
                  disabled={
                    disabled
                  }
                  onPress={() =>
                    onSelectDate(
                      cell.key,
                    )
                  }
                  className="h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    backgroundColor:
                      selected
                        ? '#007B7F'
                        : 'transparent',
                    opacity:
                      disabled
                        ? 0.28
                        : 1,
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color:
                        selected
                          ? '#FFFFFF'
                          : '#2E363B',
                    }}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              </View>
            );
          },
        )}
      </View>
    </View>
  );
}

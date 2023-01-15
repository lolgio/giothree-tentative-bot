//gbf types
const GuildWarDay = {
    0: "prelim",
    1: "day1",
    2: "day2",
    3: "day3",
    4: "day4",
};
export type GuildWarDay = keyof typeof GuildWarDay;

export type GuildWar = {
    number: number;
    day: GuildWarDay;
};

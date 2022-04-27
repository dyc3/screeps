use screeps::{prelude::*, Position, RoomName, RoomPosition};
use std::collections::{HashMap, HashSet};

pub struct RoomPositionCollection_HashMap {
    x: HashMap<u8, HashSet<u8>>,
}

impl RoomPositionCollection_HashMap {
    pub fn new() -> Self {
        Self { x: HashMap::new() }
    }

    pub fn add(&mut self, pos: RoomPosition) {
        let x = pos.x() as u8;
        let y = pos.y() as u8;
        self.x.entry(x).or_insert_with(HashSet::new).insert(y);
    }

    pub fn remove(&mut self, pos: RoomPosition) {
        let x = pos.x() as u8;
        let y = pos.y() as u8;
        self.x.entry(x).and_modify(|set| {
            set.remove(&y);
        });
    }

    pub fn contains(&self, pos: RoomPosition) -> bool {
        let x = pos.x() as u8;
        let y = pos.y() as u8;
        self.x.get(&x).map(|set| set.contains(&y)).unwrap_or(false)
    }

    pub fn len(&self) -> usize {
        self.x.values().map(|set| set.len()).sum()
    }

    pub fn iter(&self) -> impl Iterator<Item = RoomPosition> + '_ {
        self.x.iter().flat_map(|(x, set)| {
            set.iter().map(move |y| {
                RoomPosition::new(*x as u32, *y as u32, RoomName::new("E0N0").unwrap())
            })
        })
    }
}

pub struct RoomPositionCollection_HashSetPacked {
    positions: HashSet<RoomPosition>,
}

impl RoomPositionCollection_HashSetPacked {
    pub fn new() -> Self {
        Self {
            positions: HashSet::new(),
        }
    }

    pub fn add(&mut self, pos: RoomPosition) {
        self.positions.insert(pos);
    }

    pub fn remove(&mut self, pos: RoomPosition) {
        self.positions.remove(&pos);
    }

    pub fn contains(&self, pos: RoomPosition) -> bool {
        self.positions.contains(&pos)
    }

    pub fn len(&self) -> usize {
        self.positions.len()
    }

    pub fn iter(&self) -> impl Iterator<Item = RoomPosition> + '_ {
        self.positions.iter().cloned()
    }
}

use screeps::{prelude::*, Position, RoomName, RoomPosition};
use std::collections::{HashMap, HashSet};

mod position_collections;
pub use position_collections::*;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RoomPositionCollection {
    positions: HashSet<RoomPosition>,
}

impl RoomPositionCollection {
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

impl FromIterator<RoomPosition> for RoomPositionCollection {
    fn from_iter<I: IntoIterator<Item = RoomPosition>>(iter: I) -> Self {
        Self {
            positions: HashSet::from_iter(iter),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use pretty_assertions::assert_eq;

    #[test]
    fn it_works() {
        let result = 2 + 2;
        assert_eq!(result, 4);
    }
}

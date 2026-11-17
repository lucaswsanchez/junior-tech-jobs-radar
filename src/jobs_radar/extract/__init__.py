"""Extract stage: one connector per public job API."""

from jobs_radar.extract.base import HttpClient, Source
from jobs_radar.extract.getonbrd import GetOnBoardSource
from jobs_radar.extract.himalayas import HimalayasSource
from jobs_radar.extract.remoteok import RemoteOKSource
from jobs_radar.extract.remotive import RemotiveSource

ALL_SOURCES: tuple[type[Source], ...] = (
    GetOnBoardSource,
    HimalayasSource,
    RemotiveSource,
    RemoteOKSource,
)

__all__ = [
    "ALL_SOURCES",
    "GetOnBoardSource",
    "HimalayasSource",
    "HttpClient",
    "RemoteOKSource",
    "RemotiveSource",
    "Source",
]

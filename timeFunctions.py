# Import external modules
import datetime
import logging
import time
# Import local modules
from configuration import const as conf


def monthBounds( timestamp ):
    monthStart = datetime.datetime.fromtimestamp( int(timestamp) ).replace( day=1, hour=0, minute=0, second=0, microsecond=0 )
    monthEnd = monthStart + datetime.timedelta( days=33 )  # Use days greater than any month, because there is no timedelta field for month
    monthEnd = monthEnd.replace( day=1, hour=0, minute=0, second=0, microsecond=0 )  # Round down to start of next month
    return toSeconds(monthStart.timestamp()) , toSeconds(monthEnd.timestamp())

def dayBounds( timestamp ):
    dayStart = datetime.datetime.fromtimestamp( int(timestamp) ).replace( hour=0, minute=0, second=0, microsecond=0 )
    dayEnd = dayStart + datetime.timedelta( days=1 )
    return toSeconds(dayStart.timestamp()) , toSeconds(dayEnd.timestamp())

def toSeconds( timestampFloat ):
    return max( 0, int(timestampFloat) )


#################################################################################
# Unit test

import unittest

class TestTimeFunctions( unittest.TestCase ):

    def test_monthBounds( self ):
        t = datetime.datetime( year=2017, month=1, day=10 )
        monthStart, monthEnd = monthBounds( t.timestamp() )
        self.assertEqual( datetime.datetime(year=2017, month=1, day=1) , datetime.datetime.fromtimestamp(monthStart) )
        self.assertEqual( datetime.datetime(year=2017, month=2, day=1) , datetime.datetime.fromtimestamp(monthEnd) )

    def test_dayBounds( self ):
        t = datetime.datetime( year=2017, month=1, day=2, hour=12 )
        dayStart, dayEnd = dayBounds( t.timestamp() )
        self.assertEqual( datetime.datetime(year=2017, month=1, day=2) , datetime.datetime.fromtimestamp(dayStart) )
        self.assertEqual( datetime.datetime(year=2017, month=1, day=3) , datetime.datetime.fromtimestamp(dayEnd) )

    def test_toSeconds( self ):
        self.assertEqual( toSeconds(-3.1) , 0 )
        self.assertEqual( toSeconds(4.6) , 4 )


if __name__ == '__main__':
    unittest.main()


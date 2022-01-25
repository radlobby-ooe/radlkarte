<?php

class DB {

	private $dbh;
	private static $instance;

	public static function get_instance() {
		if ( ! self::$instance ) {
			self::$instance = new self();
		}

		return self::$instance;
	}

	private function __construct() {
		$this->dbh = new PDO( 'sqlite:../data/ratings.sqlite3' );
		$this->dbh->setAttribute( PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION );
	}

	// Magic method clone is empty to prevent duplication of connection
	private function __clone() {
	}

	public function exec( $sql ) {
		try {
			$this->dbh->exec( $sql );
		} catch ( PDOException $e ) {
			return array( false, 'database', $e->getMessage() );
		}
	}

	/**
	 * Create the table for the ratings
	 */
	public function create_tables() {
		$this->exec( 'CREATE TABLE IF NOT EXISTS ratings (
              id TEXT NOT NULL UNIQUE PRIMARY KEY,
	          item TEXT NOT NULL,
	          rating NUMERIC NOT NULL,
	          ip_address TEXT NOT NULL,
	          timestamp DATETIME
	          )' );
        $this->exec( 'CREATE TABLE IF NOT EXISTS ratings_overall (
	          item TEXT NOT NULL UNIQUE PRIMARY KEY,
	          average NUMERIC NOT NULL,
	          ratings NUMERIC NOT NULL,
	          lastupdate DATETIME
	          )' );
	}

	/**
	 * Insert a rating
	 * @param $arr params for insert: id, ip_address, item id and rating
	 *
	 * @return array
	 */
	public function insert_or_replace( $arr ) {
		try {
			$insert_or_replace = 'INSERT OR REPLACE INTO ratings (id, ip_address, item, rating, timestamp) VALUES ( :id, :ip_address, :item, :rating, datetime("now") )';
			$stmt              = $this->dbh->prepare( $insert_or_replace );
			$stmt->bindParam( ':id', $arr['id'] );
			$stmt->bindParam( ':ip_address', $arr['ip_address'] );
			$stmt->bindParam( ':item', $arr['item'] );
			$stmt->bindParam( ':rating', $arr['rating'] );

			$stmt->execute();

			return array( true, 'insert', $arr );
		} catch ( PDOException $e ) {
			return array( false, 'database', $e->getMessage() );
		}
	}

    /**
     * Insert an overall rating
     * @param $arr params for insert: id, item id and rating and count
     *
     * @return array
     */
    public function insert_or_replace_overall( $arr ) {
        try {
            $insert_or_replace = 'INSERT OR REPLACE INTO ratings_overall (item, average, ratings, lastupdate) VALUES (:item, :average, :ratings, datetime("now") )';
            $stmt              = $this->dbh->prepare( $insert_or_replace );
            $stmt->bindParam( ':item', $arr['item'] );
            $stmt->bindParam( ':average', $arr['average'] );
            $stmt->bindParam( ':ratings', $arr['ratings'] );

            $stmt->execute();

            return array( true, 'insert', $arr );
        } catch ( PDOException $e ) {
            return array( false, 'database', $e->getMessage() );
        }
    }

	/**
	 * Checks to see if a recent rating with the same id already exists
	 * @param $id   record ID
	 * @param $throttle_time how far back we look in minutes
	 *
	 * @return array|mixed
	 */
	public function select_recent_rating( $id, $throttle_time ) {
		try {
			$select_rating = 'SELECT * FROM ratings
				WHERE id = :id
				AND timestamp > datetime("now", "-' . $throttle_time . ' minute")';
			$stmt          = $this->dbh->prepare( $select_rating );
			$stmt->bindParam( ':id', $id );
			$stmt->execute();
			$result = $stmt->fetch( PDO::FETCH_ASSOC );

			return $result;
		} catch ( PDOException $e ) {
			return array( false, 'database', $e->getMessage() );
		}
	}

    /**
     * return top ratings by average
     * @param $max only first x top entries
     *
     * @return array
     */
    public function select_top_average_ratings( $max ) {
        try {
            $select_top = 'SELECT * FROM ratings_overall
				ORDER BY average DESC limit :max';
            $stmt          = $this->dbh->prepare( $select_top );
            $stmt->bindParam( ':max', $max, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetchAll( PDO::FETCH_ASSOC );

            return array( true, 'database', $result );
        } catch ( PDOException $e ) {
            return array( false, 'database', $e->getMessage() );
        }
    }

    /**
     * return top ratings by number
     * @param $max only first x top entries
     *
     * @return array
     */
    public function select_top_number_ratings( $max ) {
        try {
            $select_top = 'SELECT * FROM ratings_overall
				ORDER BY ratings DESC limit :max';
            $stmt          = $this->dbh->prepare( $select_top );
            $stmt->bindParam( ':max', $max, PDO::PARAM_INT);
            $stmt->execute();
            $result = $stmt->fetchAll( PDO::FETCH_ASSOC );

            return array( true, 'database', $result );
        } catch ( PDOException $e ) {
            return array( false, 'database', $e->getMessage() );
        }
    }

	/**
	 * Returns a count of the total ratings and number of ratings for a particular input
	 * So we can work out the average. We limit the number of records counted by RATING_QUERY_LIMIT
	 * for better performance
	 *
	 * @param $item - rating input ID
	 *
	 * @return array
	 */
	public function select_count_rating( $item ) {
		try {
			$select_count_rating = 'SELECT COUNT( rating ) AS count,
 			 SUM( rating ) AS total
 			 FROM ratings
 			 WHERE item = :item
 			 ORDER BY ratings.timestamp DESC
 			 LIMIT ' . RATING_QUERY_LIMIT;
			$stmt                = $this->dbh->prepare( $select_count_rating );
			$stmt->bindParam( ':item', $item );
			$stmt->execute();
			$result = $stmt->fetch( PDO::FETCH_ASSOC );

			return array( true, 'database', $result );

		} catch ( PDOException $e ) {

			return array( false, 'database', $e->getMessage() );
		}
	}

}


